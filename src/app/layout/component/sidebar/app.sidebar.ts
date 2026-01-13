import { Component, ElementRef, signal, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ChatBubbleService, ChatMessage } from '@shared/components/chat-bubble/chat-bubble.service';
import { ModalService } from '@shared/services/modal.service';
import { AddInvoiceModalComponent } from '@features/invoices/components/add-invoice-modal/add-invoice-modal.component';
import { LayoutService } from '../../service/layout.service';
import { filter } from 'rxjs/operators';
import { IconComponent } from '@shared/components/icon/icon.component';

interface QuickAction {
  label: string;
  icon: string;
  action: string;
}

interface RouteContext {
  title: string;
  placeholder: string;
  actions: QuickAction[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, InputTextModule, FormsModule, IconComponent],
  templateUrl: './app.sidebar.html',
})
export class AppSidebar {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  messageText = '';
  messages: ChatMessage[] = [];
  isTyping = false;
  readonly maxMessageLength = 500;
  showAttachmentMenu = false;
  currentYear = new Date().getFullYear();

  quickLinks = [
    { label: 'Dashboard', icon: 'monitoring', route: '/' },
    { label: 'Proveedores', icon: 'local_shipping', route: '/proveedores' },
    { label: 'Almacén', icon: 'warehouse', route: '/productos' },
    { label: 'Artículos', icon: 'restaurant', route: '/articulos', comingSoon: true },
    { label: 'Ventas', icon: 'payments', route: '/ventas', comingSoon: true },
    { label: 'Equípo', icon: 'group', route: '/rrhh', comingSoon: true },
    { label: 'Gestoría', icon: 'description', route: '/gestoria' },
    { label: 'Sanidad', icon: 'shield', route: '/appcc', comingSoon: true },
    { label: 'Docs', icon: 'folder', route: '/documentos', comingSoon: true },
  ];

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

  currentContext: RouteContext = this.routeContexts['/'];

  get sidebarStyle() {
    const isNotificationActive = this.layoutService.isNotificationPanelActiveOrAnimating();
    const isProfileActive = this.layoutService.isProfilePanelActiveOrAnimating();

    // Si ambos están activos
    if (isNotificationActive && isProfileActive) {
      return {
        top: 'calc(6rem + 2 * ((100vh - 10rem) / 3.5) + 2rem)',
        height: 'auto',
        bottom: '2rem'
      };
    }

    // Si alguno de los dos está activo
    if (isNotificationActive || isProfileActive) {
      return {
        top: 'calc(6rem + ((100vh - 10rem) / 3.5) + 1rem)',
        height: 'auto',
        bottom: '2rem'
      };
    }

    // Ninguno activo (default)
    return {};
  }

  get isCompactMode() {
    return this.layoutService.isNotificationPanelActiveOrAnimating() && this.layoutService.isProfilePanelActiveOrAnimating();
  }

  constructor(
    public el: ElementRef,
    private chatService: ChatBubbleService,
    private modalService: ModalService,
    public layoutService: LayoutService,
    private router: Router
  ) {
    // Actualizar contexto en base a la ruta inicial
    this.updateContextFromRoute(this.router.url);

    // Escuchar cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateContextFromRoute(event.urlAfterRedirects);
      });

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

  private updateContextFromRoute(url: string): void {
    // Limpiar query params y fragments
    const cleanUrl = url.split('?')[0].split('#')[0];

    // Buscar contexto exacto o por prefijo
    if (this.routeContexts[cleanUrl]) {
      this.currentContext = this.routeContexts[cleanUrl];
    } else {
      // Buscar por prefijo (ej: /facturas/1 -> /facturas)
      const matchedRoute = Object.keys(this.routeContexts).find(route =>
        route !== '/' && cleanUrl.startsWith(route)
      );
      this.currentContext = matchedRoute
        ? this.routeContexts[matchedRoute]
        : this.routeContexts['/'];
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const container = document.getElementById('attachment-menu-container');
    if (container && !container.contains(target)) {
      this.showAttachmentMenu = false;
    }
  }

  async sendMessage() {
    if (!this.messageText.trim()) return;

    const message = this.messageText;
    this.messageText = '';

    await this.chatService.sendMessage(message);
  }

  async handleQuickAction(action: string) {
    // Expandir chat si está en modo compacto
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

  isFirstBotMessage(index: number): boolean {
    return index === 0 && this.messages[0]?.sender === 'bot';
  }

  handleCameraCapture() {
    this.cameraInput.nativeElement.click();
  }

  async onCameraCapture(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      await this.chatService.sendMessage(`[Foto capturada: ${file.name}]`);
      console.log('Foto capturada:', file);
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
      await this.chatService.sendMessage(`[${fileType} recibido: ${file.name}]`);
      console.log('Archivo seleccionado:', file);
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
    const messagesContainer = document.getElementById('chat-messages-expanded');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  onChatInputFocus() {
    // Si hay paneles abiertos, cerrarlos para dar espacio al chat
    if (this.layoutService.isNotificationPanelActive()) {
      this.layoutService.toggleNotificationPanel();
    }

    if (this.layoutService.isProfilePanelActive()) {
      this.layoutService.toggleProfilePanel();
    }
  }
}
