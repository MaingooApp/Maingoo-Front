import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule],
  templateUrl: './chat-bubble.component.html',
  styleUrl: './chat-bubble.component.scss'
})
export class ChatBubbleComponent {
  isOpen = signal(false);

  toggleChat() {
    this.isOpen.set(!this.isOpen());
  }

  closeChat() {
    this.isOpen.set(false);
  }
}
