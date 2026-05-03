import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@features/auth/services/auth-service.service';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface AgentConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  lastMessageContent: string | null;
}

type AgentAttachmentType = 'audio' | 'image' | 'pdf' | 'file';

interface AgentFileAttachment {
  file: File;
  attachmentType: AgentAttachmentType;
}

interface RunAgentResponse {
  status: string;
  conversationId?: string | null;
  reply?: string;
  message?: string;
  output?: string;
  text?: string;
  response?: string;
}

interface AgentConversationListResponse {
  conversations: Array<{
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
    lastMessage?: {
      content: string;
    } | null;
  }>;
}

interface AgentConversationMessagesResponse {
  messages: Array<{
    id: string;
    role: 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';
    content: string;
    createdAt: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ChatBubbleService {
  private readonly agentBaseUrl = `${environment.urlBackend}api/agent`;
  private readonly agentRunUrl = `${this.agentBaseUrl}/run`;
  private readonly agentFileRunUrl = `${this.agentBaseUrl}/run/file`;
  private readonly maxMessageLength = 500;
  private readonly maxAttachmentSizeBytes = 20 * 1024 * 1024;

  private sessionId = '';
  private enterpriseId: string | null = null;
  private conversationId: string | null = null;

  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([this.createWelcomeMessage()]);
  public messages$ = this.messagesSubject.asObservable();

  private conversationsSubject = new BehaviorSubject<AgentConversationSummary[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();

  private activeConversationIdSubject = new BehaviorSubject<string | null>(null);
  public activeConversationId$ = this.activeConversationIdSubject.asObservable();

  private typingSubject = new BehaviorSubject<boolean>(false);
  public typing$ = this.typingSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {
    this.initializeSession();
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.bootstrapConversationState();

    try {
      await this.initializationPromise;
      this.initialized = true;
    } finally {
      this.initializationPromise = null;
    }
  }

  async sendMessage(message: string): Promise<void> {
    await this.ensureInitialized();

    const normalized = this.normalizeUserMessage(message);
    if (!normalized) {
      return;
    }

    await this.submitInteraction({
      userVisibleText: normalized,
      prompt: normalized
    });
  }

  async sendAttachment(file: File, prompt?: string): Promise<void> {
    await this.ensureInitialized();

    if (!file) {
      throw new Error('No se recibió archivo para adjuntar.');
    }

    if (file.size > this.maxAttachmentSizeBytes) {
      throw new Error('El archivo supera el límite de 20MB.');
    }

    const attachmentType = this.inferAttachmentType(file);
    const normalizedPrompt = this.normalizeUserMessage(prompt ?? this.defaultAttachmentPrompt(attachmentType));

    if (!normalizedPrompt) {
      throw new Error('No se pudo construir el prompt para el adjunto.');
    }

    await this.submitInteraction({
      userVisibleText: `[Adjunto: ${file.name}] ${normalizedPrompt}`,
      prompt: normalizedPrompt,
      fileAttachment: {
        file,
        attachmentType
      }
    });
  }

  async loadConversations(limit = 20): Promise<void> {
    await this.ensureInitialized();
    await this.loadConversationsInternal(limit);
  }

  async openConversation(conversationId: string): Promise<void> {
    await this.ensureInitialized();
    await this.openConversationInternal(conversationId, true);
  }

  startNewConversation(resetMessages = true): void {
    this.conversationId = null;
    this.activeConversationIdSubject.next(null);
    this.clearStoredConversationId();

    if (resetMessages) {
      this.messagesSubject.next([this.createWelcomeMessage()]);
    }
  }

  clearMessages(): void {
    this.startNewConversation(true);
  }

  private async bootstrapConversationState(): Promise<void> {
    this.initializeSession();
    await this.loadConversationsInternal();

    if (!this.conversationId) {
      return;
    }

    try {
      await this.openConversationInternal(this.conversationId, false);
    } catch {
      this.startNewConversation(true);
      await this.loadConversationsInternal();
    }
  }

  private initializeSession(): void {
    const user = this.authService.currentUser;
    this.sessionId = user?.id ?? '';
    this.enterpriseId = user?.enterpriseId ?? null;
    this.conversationId = this.readStoredConversationId();

    if (this.conversationId) {
      this.activeConversationIdSubject.next(this.conversationId);
    }
  }

  private normalizeUserMessage(message: string): string {
    let normalized = message.trim();

    if (normalized.length > this.maxMessageLength) {
      console.warn(`Mensaje truncado: excede el límite de ${this.maxMessageLength} caracteres`);
      normalized = normalized.substring(0, this.maxMessageLength);
    }

    normalized = normalized.replace(/[\x00-\x1F\x7F]/g, '');

    return normalized;
  }

  private async submitInteraction(input: {
    userVisibleText: string;
    prompt: string;
    fileAttachment?: AgentFileAttachment;
  }): Promise<void> {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input.userVisibleText,
      sender: 'user',
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, userMessage]);
    this.typingSubject.next(true);

    try {
      const response = input.fileAttachment
        ? await this.sendFileToAgent(input.prompt, input.fileAttachment)
        : await this.sendToAgent(input.prompt);

      this.typingSubject.next(false);

      if (response.conversationId) {
        this.conversationId = response.conversationId;
        this.activeConversationIdSubject.next(response.conversationId);
        this.storeConversationId(response.conversationId);
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: this.extractBotResponse(response),
        sender: 'bot',
        timestamp: new Date()
      };

      const updatedMessages = this.messagesSubject.value;
      this.messagesSubject.next([...updatedMessages, botMessage]);

      await this.loadConversationsInternal();
    } catch (error) {
      console.error('Error al enviar mensaje al agente:', error);
      this.typingSubject.next(false);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: this.toFriendlyErrorMessage(error),
        sender: 'bot',
        timestamp: new Date()
      };

      const updatedMessages = this.messagesSubject.value;
      this.messagesSubject.next([...updatedMessages, errorMessage]);
    }
  }

  private async sendToAgent(prompt: string): Promise<RunAgentResponse> {
    const payload: {
      prompt: string;
      conversationId?: string;
      metadata: Record<string, unknown>;
    } = {
      prompt,
      metadata: {
        source: 'front-chat',
        url: window.location.href,
        sentAt: new Date().toISOString()
      }
    };

    if (this.conversationId) {
      payload.conversationId = this.conversationId;
    }

    const params = this.buildEnterpriseQueryParams();

    return await firstValueFrom(this.http.post<RunAgentResponse>(this.agentRunUrl, payload, { params }));
  }

  private async sendFileToAgent(prompt: string, attachment: AgentFileAttachment): Promise<RunAgentResponse> {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('attachmentType', attachment.attachmentType);
    formData.append('documentType', this.inferDocumentType(attachment.file));
    formData.append('hasDeliveryNotes', 'false');
    formData.append('file', attachment.file, attachment.file.name);

    if (this.conversationId) {
      formData.append('conversationId', this.conversationId);
    }

    const params = this.buildEnterpriseQueryParams();

    return await firstValueFrom(this.http.post<RunAgentResponse>(this.agentFileRunUrl, formData, { params }));
  }

  private async loadConversationsInternal(limit = 20): Promise<void> {
    const params = this.buildEnterpriseQueryParams().set('limit', String(limit));

    const response = await firstValueFrom(
      this.http.get<AgentConversationListResponse>(`${this.agentBaseUrl}/conversations`, { params })
    );

    const mapped = response.conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title || 'New conversation',
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messageCount,
      lastMessageContent: conversation.lastMessage?.content ?? null
    }));

    this.conversationsSubject.next(mapped);
  }

  private async openConversationInternal(conversationId: string, refreshList: boolean): Promise<void> {
    const params = this.buildEnterpriseQueryParams().set('limit', '200');

    const response = await firstValueFrom(
      this.http.get<AgentConversationMessagesResponse>(
        `${this.agentBaseUrl}/conversations/${conversationId}/messages`,
        { params }
      )
    );

    const mappedMessages = response.messages.map((message) => ({
      id: message.id,
      text: message.content,
      sender: this.toSender(message.role),
      timestamp: new Date(message.createdAt)
    }));

    this.messagesSubject.next(
      mappedMessages.length > 0 ? mappedMessages : [this.createWelcomeMessage()]
    );

    this.conversationId = conversationId;
    this.activeConversationIdSubject.next(conversationId);
    this.storeConversationId(conversationId);

    if (refreshList) {
      await this.loadConversationsInternal();
    }
  }

  private buildEnterpriseQueryParams(): HttpParams {
    let params = new HttpParams();

    if (this.enterpriseId) {
      params = params.set('enterpriseId', this.enterpriseId);
    }

    return params;
  }

  private extractBotResponse(response: RunAgentResponse): string {
    if (!response) {
      return 'No se obtuvo respuesta del agente.';
    }

    return (
      response.reply ||
      response.message ||
      response.output ||
      response.text ||
      response.response ||
      'No se obtuvo respuesta del agente.'
    );
  }

  private toFriendlyErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return '❌ Tu sesión expiró. Inicia sesión nuevamente para usar el chat. ❌';
      }

      if (error.status === 403) {
        return '❌ No tienes permiso para usar el agente (agent.use). ❌';
      }

      if (error.status === 0) {
        return '❌ No hay conexión con el backend. ❌';
      }

      const backendMessage = this.readBackendMessage(error.error);
      if (backendMessage) {
        return `❌ ${backendMessage} ❌`;
      }
    }

    if (error instanceof Error && error.message) {
      return `❌ ${error.message} ❌`;
    }

    return '❌ Error al conectar con el agente. Inténtalo de nuevo. ❌';
  }

  private readBackendMessage(payload: unknown): string | null {
    if (typeof payload === 'string') {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if ('message' in payload && typeof payload.message === 'string') {
      return payload.message;
    }

    return null;
  }

  private inferAttachmentType(file: File): AgentAttachmentType {
    if (file.type === 'application/pdf') {
      return 'pdf';
    }

    if (file.type.startsWith('image/')) {
      return 'image';
    }

    if (file.type.startsWith('audio/')) {
      return 'audio';
    }

    return 'file';
  }

  private defaultAttachmentPrompt(type: AgentAttachmentType): string {
    switch (type) {
      case 'image':
        return 'Analiza la imagen adjunta y ayúdame con la información relevante.';
      case 'pdf':
        return 'Analiza el PDF adjunto y resume los puntos importantes.';
      case 'audio':
        return 'Analiza el audio adjunto y ayúdame con su contenido.';
      default:
        return 'Analiza el archivo adjunto y ayúdame con su contenido.';
    }
  }

  private inferDocumentType(file: File): string {
    const attachmentType = this.inferAttachmentType(file);

    if (attachmentType === 'pdf') {
      return 'pdf';
    }

    if (attachmentType === 'image') {
      return 'image';
    }

    if (attachmentType === 'audio') {
      return 'audio';
    }

    return 'file';
  }

  private toSender(role: 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL'): 'user' | 'bot' {
    return role === 'USER' ? 'user' : 'bot';
  }

  private getConversationStorageKey(): string {
    const userId = this.sessionId || 'anonymous';
    const enterpriseId = this.enterpriseId || 'no-enterprise';
    return `agent.conversationId.${userId}.${enterpriseId}`;
  }

  private readStoredConversationId(): string | null {
    const key = this.getConversationStorageKey();
    const value = localStorage.getItem(key);
    return value && value.trim().length > 0 ? value : null;
  }

  private storeConversationId(conversationId: string): void {
    localStorage.setItem(this.getConversationStorageKey(), conversationId);
  }

  private clearStoredConversationId(): void {
    localStorage.removeItem(this.getConversationStorageKey());
  }

  private createWelcomeMessage(): ChatMessage {
    return {
      id: '1',
      text: '¡Hola! ¿En qué puedo ayudarte?',
      sender: 'bot',
      timestamp: new Date()
    };
  }
}
