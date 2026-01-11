import { Component, ElementRef, HostListener, ViewChild, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BottomSheetService, SheetState } from '../../../layout/service/bottom-sheet.service';
import { ChatBubbleService, ChatMessage } from '../../../shared/components/chat-bubble/chat-bubble.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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

import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-mobile-bottom-sheet',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './mobile-bottom-sheet.component.html',
  styleUrls: ['./mobile-bottom-sheet.component.scss']
})
export class MobileBottomSheetComponent implements OnInit, OnDestroy {
  @ViewChild('sheetContainer') sheetContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  // Constantes de configuración
  private readonly DRAG_THRESHOLD = 50;
  private readonly SCROLL_DELAY = 100;
  private readonly snapPoints = {
    compact: 5,
    medium: 35,
    expanded: 90
  };

  // Estado del drag
  private startY = 0;
  private currentY = 0;
  private isDragging = false;

  // Chat properties
  messages: ChatMessage[] = [];
  isTyping = false;
  private messagesSubscription?: Subscription;
  private typingSubscription?: Subscription;
  private routerSubscription?: Subscription;

  // Quick actions y chips navegación (6 chips para grid 3x2)
  quickLinks = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/' },
    { label: 'Facturas', icon: 'pi pi-receipt', route: '/facturas' },
    { label: 'Proveedores', icon: 'pi pi-box', route: '/proveedores' },
    { label: 'Productos', icon: 'pi pi-tags', route: '/productos' },
    { label: 'Recetas', icon: 'pi pi-tags', route: '/recetas' },
    { label: 'Docs', icon: 'pi pi-file-edit', route: '/docgenerator' }
  ];

  // Contextos por ruta
  private routeContexts: { [key: string]: RouteContext } = {
    '/': {
      title: 'Accione',
      placeholder: '¿Qué necesitas saber hoy?',
      actions: [
        { label: 'Generar informe', icon: 'pi pi-chart-line', action: 'Generar informe del dashboard' },
        { label: 'Ver resumen', icon: 'pi pi-eye', action: 'Mostrar resumen general' },
        { label: 'Análisis ventas', icon: 'pi pi-chart-bar', action: 'Análisis de ventas' },
        { label: 'Estadísticas', icon: 'pi pi-chart-pie', action: 'Ver estadísticas generales' }
      ]
    },
    '/facturas': {
      title: 'Acciones rápidas',
      placeholder: 'Pregunta sobre tus facturas...',
      actions: [
        { label: 'Subir factura', icon: 'pi pi-upload', action: 'Subir factura' },
        { label: 'Informe compras', icon: 'pi pi-chart-bar', action: 'Informe de compras' },
        { label: 'Buscar factura', icon: 'pi pi-search', action: 'Buscar una factura' },
        { label: 'Exportar datos', icon: 'pi pi-download', action: 'Exportar facturas' }
      ]
    },
    '/proveedores': {
      title: 'Acciones rápidas',
      placeholder: 'Pregunta sobre tus proveedores...',
      actions: [
        { label: 'Nuevo proveedor', icon: 'pi pi-plus', action: 'Agregar nuevo proveedor' },
        { label: 'Análisis', icon: 'pi pi-chart-pie', action: 'Análisis de proveedores' },
        { label: 'Comparar precios', icon: 'pi pi-dollar', action: 'Comparar precios de proveedores' },
        { label: 'Contactos', icon: 'pi pi-users', action: 'Ver contactos de proveedores' }
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
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateContextFromRoute(event.urlAfterRedirects);
      });
  }

  // Propiedades computadas para optimización
  get currentState(): SheetState {
    return this.bottomSheetService.currentState();
  }

  get sheetHeight(): string {
    return `${this.snapPoints[this.currentState as keyof typeof this.snapPoints]}vh`;
  }

  get isDarkOverlay(): boolean {
    return this.currentState === 'expanded';
  }

  get isCompact(): boolean {
    return this.currentState === 'compact';
  }

  get isMedium(): boolean {
    return this.currentState === 'medium';
  }

  get isExpanded(): boolean {
    return this.currentState === 'expanded';
  }

  onTouchStart(event: TouchEvent) {
    this.startY = event.touches[0].clientY;
    this.isDragging = true;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;

    this.currentY = event.touches[0].clientY;
    const deltaY = this.currentY - this.startY;

    // Solo permitir arrastrar hacia abajo si está en estados superiores
    const currentState = this.bottomSheetService.currentState();
    if (deltaY > 0 || currentState !== 'compact') {
      // Aplicar transformación temporal mientras se arrastra
      if (this.sheetContainer) {
        const sheet = this.sheetContainer.nativeElement;
        sheet.style.transition = 'none';
        sheet.style.transform = `translateY(${Math.max(0, deltaY)}px)`;
      }
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (!this.isDragging) return;

    this.isDragging = false;
    const deltaY = this.currentY - this.startY;

    // Reset styles
    if (this.sheetContainer) {
      const sheet = this.sheetContainer.nativeElement;
      sheet.style.transition = '';
      sheet.style.transform = '';
    }

    const currentState = this.currentState;

    // Determinar nuevo estado basado en la dirección y distancia del arrastre
    if (Math.abs(deltaY) > this.DRAG_THRESHOLD) {
      if (deltaY > 0) {
        // Arrastrando hacia abajo - colapsar
        this.collapseState(currentState);
      } else {
        // Arrastrando hacia arriba - expandir
        this.expandState(currentState);
      }
    }

    this.startY = 0;
    this.currentY = 0;
  }

  private collapseState(current: SheetState) {
    if (current === 'expanded') {
      this.bottomSheetService.setState('medium');
    } else if (current === 'medium') {
      this.bottomSheetService.setState('compact');
    }
  }

  private expandState(current: SheetState) {
    if (current === 'compact') {
      this.bottomSheetService.setState('medium');
    } else if (current === 'medium') {
      this.bottomSheetService.setState('expanded');
    }
  }

  onHeaderClick(event?: Event) {
    // Si el evento viene de un elemento hijo (como un chip), no hacer nada
    if (event && event.target !== event.currentTarget) {
      return;
    }

    // Click en el header para ciclar entre estados: compact → medium → expanded → compact
    const current = this.currentState;
    if (current === 'compact') {
      this.bottomSheetService.setState('medium');
    } else if (current === 'medium') {
      this.bottomSheetService.setState('expanded');
    } else {
      this.bottomSheetService.setState('compact');
    }
  }

  ngOnInit() {
    // Suscribirse a los mensajes del chat
    this.messagesSubscription = this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
      // Scroll automático al último mensaje después de que se renderice
      setTimeout(() => this.scrollToBottom(), this.SCROLL_DELAY);
    });

    // Suscribirse al indicador de escritura
    this.typingSubscription = this.chatService.typing$.subscribe(typing => {
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
      const matchedRoute = Object.keys(this.routeContexts).find(route =>
        route !== '/' && cleanUrl.startsWith(route)
      );
      this.currentContext = matchedRoute
        ? this.routeContexts[matchedRoute]
        : this.routeContexts['/'];
    }
  }

  navigateTo(route: string, event?: Event): void {
    // Prevenir que el evento burbujee y active el onHeaderClick
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Si está en compacto, expandir a medium antes de navegar
    // Si está en medium o expanded, mantener el estado actual (no expandir)
    if (this.isCompact) {
      this.bottomSheetService.setState('medium');
    }
    // Si está en medium o expanded, solo navegar sin cambiar estado

    this.router.navigate([route]);
  }

  onInputFocus(): void {
    // Expandir a modo completo cuando se hace focus en el input en estado medium
    if (this.isMedium) {
      this.bottomSheetService.setState('expanded');
    }
  }

  async handleQuickAction(action: string): Promise<void> {
    try {
      // Enviar la acción al chat
      await this.chatService.sendMessage(action);
      // Mantener expandido para mostrar la respuesta
    } catch (error) {
      console.error('Error al procesar acción rápida:', error);
      // Aquí podrías mostrar un toast o notificación al usuario
    }
  }

  async sendMessage(input: HTMLInputElement): Promise<void> {
    const message = input.value.trim();
    if (!message) return;

    try {
      // Limpiar input inmediatamente
      input.value = '';

      // Enviar mensaje usando el servicio de chat (conecta a n8n)
      await this.chatService.sendMessage(message);

      // Si está en estado compacto, expandir para ver la respuesta
      if (this.isCompact) {
        this.bottomSheetService.setState('expanded');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Restaurar el mensaje en caso de error
      input.value = message;
      // Aquí podrías mostrar un toast o notificación al usuario
    }
  }

  onBackdropClick(): void {
    // Si está expandido, colapsar a compacto al hacer click en el backdrop
    if (this.isExpanded) {
      this.bottomSheetService.setState('compact');
    }
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
