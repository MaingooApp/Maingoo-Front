import { Component, ElementRef, HostListener, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BottomSheetService } from '../../../layout/service/bottom-sheet.service';
import { ChatBubbleService, ChatMessage } from '../../../shared/components/chat-bubble/chat-bubble.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IconComponent } from '../../../shared/components/icon/icon.component';

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
  selector: 'app-mobile-bottom-sheet',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './mobile-bottom-sheet.component.html',
  styleUrls: ['./mobile-bottom-sheet.component.scss']
})
export class MobileBottomSheetComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  // Constantes de configuración
  private readonly SCROLL_DELAY = 100;

  // Chat properties
  messages: ChatMessage[] = [];
  isTyping = false;
  isSending = false;
  private messagesSubscription?: Subscription;
  private typingSubscription?: Subscription;
  private routerSubscription?: Subscription;

  // Contextos por ruta (para las acciones rápidas)
  private routeContexts: { [key: string]: RouteContext } = {
    '/': {
      title: 'Acciones rápidas',
      placeholder: '¿Qué necesitas saber hoy?',
      actions: [
        { label: 'Generar informe', icon: 'analytics', action: 'Generar informe del dashboard' },
        { label: 'Ver resumen', icon: 'visibility', action: 'Mostrar resumen general' }
      ]
    },
    '/facturas': {
      title: 'Acciones rápidas',
      placeholder: 'Pregunta sobre tus facturas...',
      actions: [
        { label: 'Subir factura', icon: 'upload', action: 'Subir factura' },
        { label: 'Informe compras', icon: 'bar_chart', action: 'Informe de compras' }
      ]
    },
    '/proveedores': {
      title: 'Acciones rápidas',
      placeholder: 'Pregunta sobre tus proveedores...',
      actions: [
        { label: 'Nuevo proveedor', icon: 'add', action: 'Agregar nuevo proveedor' },
        { label: 'Análisis', icon: 'pie_chart', action: 'Análisis de proveedores' }
      ]
    },
    '/productos': {
      title: 'Acciones rápidas',
      placeholder: 'Pregunta sobre tus productos...',
      actions: [
        { label: 'Nuevo producto', icon: 'add', action: 'Agregar nuevo producto' },
        { label: 'Stock bajo', icon: 'warning', action: 'Ver productos con stock bajo' }
      ]
    },
    '/recetas': {
      title: 'Acciones rápidas',
      placeholder: 'Pregunta sobre tus recetas...',
      actions: [
        { label: 'Crear receta', icon: 'add', action: 'Crear nueva receta' },
        { label: 'Costeo', icon: 'calculate', action: 'Análisis de costeo de recetas' }
      ]
    },
    '/docgenerator': {
      title: 'Acciones rápidas',
      placeholder: 'Genera documentos...',
      actions: [
        { label: 'Nuevo documento', icon: 'note_add', action: 'Generar nuevo documento' },
        { label: 'Plantillas', icon: 'content_copy', action: 'Ver plantillas disponibles' }
      ]
    }
  };

  currentContext: RouteContext = this.routeContexts['/'];

  constructor(
    public bottomSheetService: BottomSheetService,
    private chatService: ChatBubbleService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    // Actualizar contexto en base a la ruta inicial
    this.updateContextFromRoute(this.router.url);

    // Escuchar cambios de ruta
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateContextFromRoute(event.urlAfterRedirects);
      });
  }

  // Propiedades computadas
  get isOpen(): boolean {
    return this.bottomSheetService.isChatOpen();
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: Event) {
    // Si navegamos hacia atrás (por botón físico o gesto), cerrar el chat
    if (this.isOpen) {
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
    this.routerSubscription?.unsubscribe();
  }

  private updateContextFromRoute(url: string): void {
    // Limpiar query params y fragments
    const cleanUrl = url.split('?')[0].split('#')[0];

    // Buscar contexto exacto o por prefijo
    if (this.routeContexts[cleanUrl]) {
      this.currentContext = this.routeContexts[cleanUrl];
    } else {
      // Buscar por prefijo (ej: /facturas/1 -> /facturas)
      const matchedRoute = Object.keys(this.routeContexts).find((route) => route !== '/' && cleanUrl.startsWith(route));
      this.currentContext = matchedRoute ? this.routeContexts[matchedRoute] : this.routeContexts['/'];
    }
  }

  async handleQuickAction(action: string): Promise<void> {
    try {
      // Enviar la acción al chat
      await this.chatService.sendMessage(action);
      // Mantener expandido para mostrar la respuesta
    } catch (error) {
      console.error('Error al procesar acción rápida:', error);
    }
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

      // Enviar mensaje usando el servicio de chat (conecta a n8n)
      await this.chatService.sendMessage(message);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Restaurar el mensaje en caso de error
      input.value = message;
      this.isSending = false;
    }
  }

  closeChat(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.bottomSheetService.closeChat();
  }

  onBackdropClick(): void {
    this.closeChat();
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
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
