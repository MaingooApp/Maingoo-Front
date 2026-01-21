import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ChatMessage } from '@shared/components/chat-bubble/chat-bubble.service';

/**
 * Interfaz para las acciones rápidas del chat
 */
export interface QuickAction {
	label: string;
	icon: string;
	action: string;
}

/**
 * Interfaz para el contexto de ruta
 */
export interface RouteContext {
	title: string;
	placeholder: string;
	actions: QuickAction[];
}

/**
 * SidebarChatComponent
 * 
 * Componente que encapsula toda la funcionalidad del chat del sidebar:
 * - Área de mensajes con scroll
 * - Indicador de escritura
 * - Acciones rápidas contextuales
 * - Input de mensaje con adjuntos
 */
@Component({
	selector: 'app-sidebar-chat',
	standalone: true,
	imports: [CommonModule, FormsModule, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './sidebar-chat.component.html'
})
export class SidebarChatComponent {
	@ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
	@ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
	@ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

	/** Lista de mensajes del chat */
	@Input() messages: ChatMessage[] = [];

	/** Indica si el bot está escribiendo */
	@Input() isTyping = false;

	/** Modo compacto (oculta área de mensajes) */
	@Input() isCompactMode = false;

	/** Contexto actual de la ruta (placeholder y acciones) */
	@Input() currentContext: RouteContext = { title: '', placeholder: '', actions: [] };

	/** Longitud máxima del mensaje */
	@Input() maxMessageLength = 500;

	/** Evento cuando se envía un mensaje */
	@Output() messageSent = new EventEmitter<string>();

	/** Evento cuando se ejecuta una acción rápida */
	@Output() quickActionTriggered = new EventEmitter<string>();

	/** Evento cuando se captura una foto */
	@Output() cameraCapture = new EventEmitter<File>();

	/** Evento cuando se selecciona un archivo */
	@Output() fileSelected = new EventEmitter<File>();

	/** Evento cuando el input recibe focus */
	@Output() inputFocused = new EventEmitter<void>();

	messageText = '';
	showAttachmentMenu = false;

	/**
	 * Envía el mensaje actual
	 */
	sendMessage(): void {
		if (!this.messageText.trim()) return;
		this.messageSent.emit(this.messageText);
		this.messageText = '';
	}

	/**
	 * Ejecuta una acción rápida
	 */
	handleQuickAction(action: string): void {
		this.quickActionTriggered.emit(action);
	}

	/**
	 * Abre el input de cámara
	 */
	handleCameraCapture(): void {
		this.cameraInput.nativeElement.click();
	}

	/**
	 * Procesa la foto capturada
	 */
	onCameraCapture(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			this.cameraCapture.emit(input.files[0]);
			input.value = '';
		}
	}

	/**
	 * Abre el input de archivos
	 */
	handleFileUpload(): void {
		this.fileInput.nativeElement.click();
	}

	/**
	 * Procesa el archivo seleccionado
	 */
	onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			this.fileSelected.emit(input.files[0]);
			input.value = '';
		}
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
	 */
	onChatInputFocus(): void {
		this.inputFocused.emit();
	}
}
