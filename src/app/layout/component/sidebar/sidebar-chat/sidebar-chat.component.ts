import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ChatBubbleService, ChatMessage } from '@shared/components/chat-bubble/chat-bubble.service';
import { ModalService } from '@shared/services/modal.service';
import { AddInvoiceModalComponent } from '@features/invoices/components/add-invoice-modal/add-invoice-modal.component';

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
	@ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
	@ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
	@ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

	/** Modo compacto (oculta área de mensajes) */
	@Input() isCompactMode = false;

	/** Evento cuando el input recibe focus - El padre puede necesitar reaccionar (cerrar otros paneles) */
	@Output() inputFocused = new EventEmitter<void>();

	// Servicios
	private router = inject(Router);
	private chatService = inject(ChatBubbleService);
	private modalService = inject(ModalService);

	// Estado
	messages: ChatMessage[] = [];
	isTyping = false;
	messageText = '';
	showAttachmentMenu = false;
	currentContext: RouteContext = { title: '', placeholder: '', actions: [] };
	maxMessageLength = 500;

	private subscriptions: Subscription[] = [];

	// Contextos por ruta
	private routeContexts: { [key: string]: RouteContext } = {
		'/': {
			title: 'Acciones rápidas',
			placeholder: '¿Qué necesitas saber hoy?',
			actions: [
				{ label: 'Generar informe', icon: 'analytics', action: 'Generar informe del dashboard' },
				{ label: 'Ver resumen', icon: 'visibility', action: 'Mostrar resumen general' },
				{ label: 'Análisis ventas', icon: 'bar_chart', action: 'Análisis de ventas' },
				{ label: 'Estadísticas', icon: 'pie_chart', action: 'Ver estadísticas generales' }
			]
		},
		'/facturas': {
			title: 'Acciones rápidas',
			placeholder: 'Pregunta sobre tus facturas...',
			actions: [
				{ label: 'Subir factura', icon: 'upload', action: 'Subir factura' },
				{ label: 'Informe compras', icon: 'bar_chart', action: 'Informe de compras' },
				{ label: 'Buscar factura', icon: 'search', action: 'Buscar una factura' },
				{ label: 'Exportar datos', icon: 'download', action: 'Exportar facturas' }
			]
		},
		'/proveedores': {
			title: 'Acciones rápidas',
			placeholder: 'Pregunta sobre tus proveedores...',
			actions: [
				{ label: 'Nuevo proveedor', icon: 'add', action: 'Agregar nuevo proveedor' },
				{ label: 'Análisis', icon: 'pie_chart', action: 'Análisis de proveedores' },
				{ label: 'Comparar precios', icon: 'attach_money', action: 'Comparar precios de proveedores' },
				{ label: 'Contactos', icon: 'group', action: 'Ver contactos de proveedores' }
			]
		},
		'/productos': {
			title: 'Acciones rápidas',
			placeholder: 'Pregunta sobre tus productos...',
			actions: [
				{ label: 'Nuevo producto', icon: 'add', action: 'Agregar nuevo producto' },
				{ label: 'Stock bajo', icon: 'warning', action: 'Ver productos con stock bajo' },
				{ label: 'Actualizar precios', icon: 'sync', action: 'Actualizar precios de productos' },
				{ label: 'Categorías', icon: 'label', action: 'Gestionar categorías' }
			]
		},
		'/recetas': {
			title: 'Acciones rápidas',
			placeholder: 'Pregunta sobre tus recetas...',
			actions: [
				{ label: 'Crear receta', icon: 'add', action: 'Crear nueva receta' },
				{ label: 'Costeo', icon: 'calculate', action: 'Análisis de costeo de recetas' },
				{ label: 'Ingredientes', icon: 'list', action: 'Ver ingredientes disponibles' },
				{ label: 'Rentabilidad', icon: 'percent', action: 'Análisis de rentabilidad' }
			]
		},
		'/docgenerator': {
			title: 'Acciones rápidas',
			placeholder: 'Genera documentos...',
			actions: [
				{ label: 'Nuevo documento', icon: 'note_add', action: 'Generar nuevo documento' },
				{ label: 'Plantillas', icon: 'content_copy', action: 'Ver plantillas disponibles' },
				{ label: 'Mis documentos', icon: 'folder', action: 'Ver mis documentos' },
				{ label: 'Compartir', icon: 'share', action: 'Compartir documento' }
			]
		}
	};

	constructor() {
		this.currentContext = this.routeContexts['/facturas'] || this.routeContexts['/']; // Fallback inicial seguro
	}

	ngOnInit(): void {
		// Actualizar contexto en base a la ruta inicial
		this.updateContextFromRoute(this.router.url);

		// Escuchar cambios de ruta
		this.subscriptions.push(
			this.router.events
				.pipe(filter(event => event instanceof NavigationEnd))
				.subscribe((event: any) => {
					this.updateContextFromRoute(event.urlAfterRedirects);
				})
		);

		// Suscribirse a los mensajes
		this.subscriptions.push(
			this.chatService.messages$.subscribe(messages => {
				this.messages = messages;
				setTimeout(() => this.scrollToBottom(), 100);
			})
		);

		// Suscribirse al estado de escritura
		this.subscriptions.push(
			this.chatService.typing$.subscribe(typing => {
				this.isTyping = typing;
				if (typing) {
					setTimeout(() => this.scrollToBottom(), 100);
				}
			})
		);
	}

	ngOnDestroy(): void {
		this.subscriptions.forEach(sub => sub.unsubscribe());
	}

	private updateContextFromRoute(url: string): void {
		// Limpiar query params y fragments
		const cleanUrl = url.split('?')[0].split('#')[0];

		// Buscar contexto exacto o por prefijo
		if (this.routeContexts[cleanUrl]) {
			this.currentContext = this.routeContexts[cleanUrl];
		} else {
			// Buscar por prefijo
			const matchedRoute = Object.keys(this.routeContexts).find(route =>
				route !== '/' && cleanUrl.startsWith(route)
			);
			this.currentContext = matchedRoute
				? this.routeContexts[matchedRoute]
				: this.routeContexts['/'];
		}
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

	/**
	 * Ejecuta una acción rápida
	 */
	async handleQuickAction(action: string): Promise<void> {
		this.onChatInputFocus();

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

	/**
	 * Abre el input de cámara
	 */
	handleCameraCapture(): void {
		this.cameraInput.nativeElement.click();
	}

	/**
	 * Procesa la foto capturada
	 */
	async onCameraCapture(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			await this.chatService.sendMessage(`[Foto capturada: ${file.name}]`);
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
	async onFileSelected(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			const fileType = file.type.startsWith('image/') ? 'Imagen' : 'Documento';
			await this.chatService.sendMessage(`[${fileType} recibido: ${file.name}]`);
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

	private scrollToBottom() {
		const messagesContainer = document.getElementById('chat-messages-expanded');
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}
}
