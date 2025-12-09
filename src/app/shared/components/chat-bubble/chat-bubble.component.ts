import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ChatBubbleService, ChatMessage } from './chat-bubble.service';
import { ModalService } from '@shared/services/modal.service';
import { AddInvoiceModalComponent } from '@features/invoices/components/add-invoice-modal/add-invoice-modal.component';

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, InputTextModule, FormsModule],
  templateUrl: './chat-bubble.component.html',
  styleUrl: './chat-bubble.component.scss'
})
export class ChatBubbleComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  
  isOpen = signal(false);
  isExpanded = signal(false);
  messageText = '';
  messages: ChatMessage[] = [];
  isTyping = false;
  isRecording = false;
  
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  quickLinks = [
    { label: 'Panel de control', icon: 'pi pi-home', route: '/' },
    { label: 'Facturas', icon: 'pi pi-receipt', route: '/facturas' },
    { label: 'Proveedores', icon: 'pi pi-box', route: '/proveedores' },
    { label: 'Productos', icon: 'pi pi-tags', route: '/productos' },
    { label: 'Generador', icon: 'pi pi-file-edit', route: '/docgenerator' },
    { label: 'Horarios', icon: 'pi pi-calendar', route: '/horarios' },
    { label: 'Configuración', icon: 'pi pi-cog', route: '/configuracion' }
  ];

  constructor(
    private chatService: ChatBubbleService,
    private modalService: ModalService
  ) {
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

  expandChat() {
    this.isExpanded.set(true);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  minimizeChat() {
    this.isExpanded.set(false);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  closeChat() {
    this.isExpanded.set(false);
    this.isOpen.set(false);
  }

  async sendMessage() {
    if (!this.messageText.trim()) return;

    const message = this.messageText;
    this.messageText = '';

    await this.chatService.sendMessage(message);
  }

  async handleQuickAction(action: string) {
    if (action === 'Subir factura') {
      this.modalService.open(AddInvoiceModalComponent, {
        width: '960px',
        header: 'Agregar documento',
        dismissableMask: false
      });
    } else {
      await this.chatService.sendMessage(action);
    }
  }

  isFirstBotMessage(index: number): boolean {
    return index === 0 && this.messages[0]?.sender === 'bot';
  }

  async handleVoiceInput() {
    if (!this.isRecording) {
      // Iniciar grabación
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await this.sendVoiceMessage(audioBlob);
          
          // Detener el stream
          stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
        this.isRecording = true;
      } catch (error) {
        console.error('Error al acceder al micrófono:', error);
        alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
      }
    } else {
      // Detener grabación
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        this.isRecording = false;
      }
    }
  }

  async sendVoiceMessage(audioBlob: Blob) {
    // TODO: Implementar transcripción con Whisper
    // Por ahora, enviamos un mensaje indicando que se recibió el audio
    await this.chatService.sendMessage('[Nota de voz recibida - Transcripción pendiente]');
    console.log('Audio blob:', audioBlob);
  }

  handleCameraCapture() {
    this.cameraInput.nativeElement.click();
  }

  async onCameraCapture(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // TODO: Implementar análisis de imagen con IA
      await this.chatService.sendMessage(`[Foto capturada: ${file.name}]`);
      console.log('Foto capturada:', file);
      
      // Limpiar el input
      input.value = '';
    }
  }

  handleFileUpload() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const fileType = file.type.startsWith('image/') ? 'Imagen' : 'Documento';
      
      // TODO: Implementar análisis de archivo con IA
      await this.chatService.sendMessage(`[${fileType} recibido: ${file.name}]`);
      console.log('Archivo seleccionado:', file);
      
      // Limpiar el input
      input.value = '';
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize() {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }

  private scrollToBottom() {
    const containerId = this.isExpanded() ? 'chat-messages-expanded' : 'chat-messages';
    const messagesContainer = document.getElementById(containerId);
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
}
