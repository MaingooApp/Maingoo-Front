import { Component, ElementRef, HostListener, Input, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BottomSheetService } from '../../../layout/service/bottom-sheet.service';
import { AuthService } from '../../../features/auth/services/auth-service.service';
import { ChatBubbleService, ChatMessage } from '../../../shared/components/chat-bubble/chat-bubble.service';
import { DocumentAnalysisService } from '../../../core/services/document-analysis.service';
import { DocumentType } from '../../../core/enums/documents.enum';
import { ToastService } from '../../../shared/services/toast.service';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-mobile-bottom-sheet',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './mobile-bottom-sheet.component.html',
  styleUrls: ['./mobile-bottom-sheet.component.scss']
})
export class MobileBottomSheetComponent implements OnInit, OnDestroy {
  @Input() mobileChatOnly = false;

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput?: ElementRef<HTMLInputElement>;

  // Constantes de configuración
  private readonly SCROLL_DELAY = 100;

  // Chat properties
  messages: ChatMessage[] = [];
  isTyping = false;
  isSending = false;
  showInvoiceUploadOptions = false;
  isUploadingInvoice = false;
  private messagesSubscription?: Subscription;
  private typingSubscription?: Subscription;

  constructor(
    public bottomSheetService: BottomSheetService,
    private chatService: ChatBubbleService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private documentAnalysisService: DocumentAnalysisService,
    private toastService: ToastService
  ) {}

  // Propiedades computadas
  get isOpen(): boolean {
    return this.mobileChatOnly || this.bottomSheetService.isChatOpen();
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: Event) {
    // Si navegamos hacia atrás (por botón físico o gesto), cerrar el chat
    if (!this.mobileChatOnly && this.isOpen) {
      this.bottomSheetService.closeChat();
    }
  }

  ngOnInit() {
    // Suscribirse a los mensajes del chat
    this.messagesSubscription = this.chatService.messages$.subscribe((messages) => {
      this.messages = messages;
      // Scroll automático al último mensaje después de que se renderice
      setTimeout(() => this.scrollToBottom(), this.SCROLL_DELAY);
    });

    // Suscribirse al indicador de escritura
    this.typingSubscription = this.chatService.typing$.subscribe((typing) => {
      this.isTyping = typing;
      if (typing) {
        setTimeout(() => this.scrollToBottom(), this.SCROLL_DELAY);
      }
    });
  }

  ngOnDestroy() {
    // Limpiar suscripciones
    this.messagesSubscription?.unsubscribe();
    this.typingSubscription?.unsubscribe();
  }

  async sendMessage(input: HTMLInputElement): Promise<void> {
    const message = input.value.trim();
    if (!message) return;

    // Activar animación
    this.isSending = true;
    setTimeout(() => (this.isSending = false), 600);

    try {
      // Limpiar input inmediatamente
      input.value = '';

      // Enviar mensaje usando el servicio de chat (conecta al ms-agent via gateway)
      await this.chatService.sendMessage(message);
    } catch {
      // Restaurar el mensaje en caso de error
      input.value = message;
      this.isSending = false;
    }
  }

  toggleInvoiceUploadOptions(): void {
    this.showInvoiceUploadOptions = !this.showInvoiceUploadOptions;
  }

  chooseInvoiceFile(): void {
    this.showInvoiceUploadOptions = false;
    this.fileInput?.nativeElement.click();
  }

  captureInvoicePhoto(): void {
    this.showInvoiceUploadOptions = false;
    this.cameraInput?.nativeElement.click();
  }

  onInvoiceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadInvoice(file);
    input.value = '';
  }

  onInvoicePhotoCaptured(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadInvoice(file);
    input.value = '';
  }

  startNewConversation(): void {
    this.chatService.startNewConversation(true);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  closeChat(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.mobileChatOnly) {
      return;
    }
    this.bottomSheetService.closeChat();
  }

  onBackdropClick(): void {
    if (this.mobileChatOnly) {
      return;
    }
    this.closeChat();
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  private uploadInvoice(file: File): void {
    if (this.isUploadingInvoice) {
      return;
    }

    this.isUploadingInvoice = true;

    this.documentAnalysisService
      .submitInvoiceForAnalysis(file, {
        documentType: DocumentType.INVOICE,
        hasDeliveryNotes: false
      })
      .subscribe({
        next: () => {
          this.toastService.success('Factura subida', 'La factura se está analizando por IA...', 3000);
          this.isUploadingInvoice = false;
        },
        error: () => {
          this.toastService.error('Error al subir', 'No se pudo subir la factura. Intenta nuevamente.', 5000);
          this.isUploadingInvoice = false;
        }
      });
  }

  // Métodos de utilidad para el template
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Sanitiza el HTML de los mensajes para prevenir XSS
   */
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.sanitize(1, html) || '';
  }
}
