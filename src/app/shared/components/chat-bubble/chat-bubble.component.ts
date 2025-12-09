import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ChatBubbleService, ChatMessage } from './chat-bubble.service';

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, FormsModule],
  templateUrl: './chat-bubble.component.html',
  styleUrl: './chat-bubble.component.scss'
})
export class ChatBubbleComponent {
  isOpen = signal(false);
  messageText = '';
  messages: ChatMessage[] = [];
  isTyping = false;

  constructor(private chatService: ChatBubbleService) {
    // Suscribirse a los mensajes
    this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
      setTimeout(() => this.scrollToBottom(), 100);
    });

    // Suscribirse al estado de escritura
    this.chatService.typing$.subscribe(typing => {
      this.isTyping = typing;
      if (typing) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  closeChat() {
    this.isOpen.set(false);
  }

  async sendMessage() {
    if (!this.messageText.trim()) return;

    const message = this.messageText;
    this.messageText = '';

    await this.chatService.sendMessage(message);
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
}
