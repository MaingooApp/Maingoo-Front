import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatBubbleService {
  private n8nWebhookUrl = 'https://n8n.maingoo.tech/webhook-test/app-chat';
  private sessionId: string;
  
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([
    {
      id: '1',
      text: '¡Hola! ¿En qué puedo ayudarte?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  
  public messages$ = this.messagesSubject.asObservable();
  
  private typingSubject = new BehaviorSubject<boolean>(false);
  public typing$ = this.typingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    // Intentar obtener sessionId existente del sessionStorage
    let sessionId = sessionStorage.getItem('maingoo_chat_session_id');

    if (!sessionId) {
      // Si no existe, crear uno nuevo y guardarlo
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      sessionId = `chat_${timestamp}_${random}`;

      // Guardar en sessionStorage para que persista durante toda la sesión del navegador
      sessionStorage.setItem('maingoo_chat_session_id', sessionId);
    }

    return sessionId;
  }

  async sendMessage(message: string): Promise<void> {
    if (!message.trim()) return;

    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, userMessage]);

    // Mostrar indicador de escritura
    this.typingSubject.next(true);

    try {
      // Enviar a n8n webhook
      const response = await this.sendToN8n(message);

      // Ocultar indicador de escritura
      this.typingSubject.next(false);

      // Agregar respuesta del bot
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: this.extractBotResponse(response),
        sender: 'bot',
        timestamp: new Date()
      };

      const updatedMessages = this.messagesSubject.value;
      this.messagesSubject.next([...updatedMessages, botMessage]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      // Ocultar indicador de escritura
      this.typingSubject.next(false);

      // Mensaje de error amigable
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: '❌ No conectado a N8N. Por favor, inténtalo de nuevo más tarde ❌',
        sender: 'bot',
        timestamp: new Date()
      };

      const updatedMessages = this.messagesSubject.value;
      this.messagesSubject.next([...updatedMessages, errorMessage]);
    }
  }

  private async sendToN8n(message: string): Promise<any> {
    const payload = {
      message: message,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      source: 'app-chat',
      url: window.location.href,
    };

    const response = await this.http.post(this.n8nWebhookUrl, payload).toPromise();
    return response;
  }

  private extractBotResponse(response: any): string {
    // Intenta diferentes campos de respuesta que n8n podría usar
    if (response) {
      return response.message ||
        response.output ||
        response.reply ||
        response.text ||
        response.response ||
        '¡Gracias por contactarnos! Un representante se pondrá en contacto contigo pronto. 📧';
    }
    return '¡Perfecto! Tu mensaje ha sido recibido. Te contactaremos pronto. ✨';
  }

  clearMessages(): void {
    this.messagesSubject.next([
      {
        id: '1',
        text: '¡Hola! ¿En qué puedo ayudarte?',
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  }

  setN8nWebhookUrl(url: string): void {
    this.n8nWebhookUrl = url;
  }
}
