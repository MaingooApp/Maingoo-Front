import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ChatBubbleService, ChatMessage } from '@shared/components/chat-bubble/chat-bubble.service';
import { ModalService } from '@shared/services/modal.service';
import { AddInvoiceModalComponent } from '@features/invoices/components/add-invoice-modal/add-invoice-modal.component';

/**
 * SidebarChatComponent
 *
 * Componente que encapsula toda la funcionalidad del chat del sidebar.
 * Ahora es un componente inteligente que gestiona su propio estado.
 */
@Component({
  selector: 'app-sidebar-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './sidebar-chat.component.html'
})
export class SidebarChatComponent implements OnInit, OnDestroy {
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  // Servicios
  private chatService = inject(ChatBubbleService);
  private modalService = inject(ModalService);

  // Estado
  messages: ChatMessage[] = [];
  isTyping = false;
  messageText = '';
  placeholder = '¿Qué necesitas saber hoy?';
  maxMessageLength = 500;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Suscribirse a los mensajes
    this.subscriptions.push(
      this.chatService.messages$.subscribe((messages) => {
        this.messages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      })
    );

    // Suscribirse al estado de escritura
    this.subscriptions.push(
      this.chatService.typing$.subscribe((typing) => {
        this.isTyping = typing;
        if (typing) {
          setTimeout(() => this.scrollToBottom(), 100);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Envía el mensaje actual
   */
  async sendMessage(): Promise<void> {
    if (!this.messageText.trim()) return;
    const text = this.messageText;
    this.messageText = '';
    await this.chatService.sendMessage(text);
  }

  openInvoiceUpload(): void {
    this.modalService.open(AddInvoiceModalComponent, {
      width: '960px',
      header: 'Agregar documento',
      dismissableMask: false
    });
  }

  /**
   * Maneja las teclas presionadas (Enter para enviar)
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Auto-resize del textarea
   */
  autoResize(): void {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }

  /**
   * Maneja el focus del input
   * UPDATE: Ya no emitimos evento porque no hay paneles que cerrar
   */
  onChatInputFocus(): void {
    // No-op
  }

  private scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages-expanded');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  async startNewConversation(): Promise<void> {
    this.chatService.startNewConversation(true);
  }
}
