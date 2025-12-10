import { Component, ElementRef, HostListener, ViewChild, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
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

@Component({
  selector: 'app-mobile-bottom-sheet',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mobile-bottom-sheet.component.html',
  styleUrls: ['./mobile-bottom-sheet.component.scss']
})
export class MobileBottomSheetComponent implements OnInit, OnDestroy {
  @ViewChild('sheetContainer') sheetContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  private startY = 0;
  private currentY = 0;
  private isDragging = false;
  
  // Snap points en porcentajes de altura de viewport
  private readonly snapPoints = {
    compact: 25,
    medium: 35,
    expanded: 90
  };

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
    private router: Router
  ) {
    // Actualizar contexto en base a la ruta inicial
    this.updateContextFromRoute(this.router.url);

    // Escuchar cambios de ruta
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateContextFromRoute(event.urlAfterRedirects);
      });
  }

  get sheetHeight(): string {
    const state = this.bottomSheetService.currentState();
    return `${this.snapPoints[state as keyof typeof this.snapPoints]}vh`;
  }

  get isDarkOverlay(): boolean {
    return this.bottomSheetService.currentState() === 'expanded';
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
    const threshold = 50; // pixels para cambiar de estado
    
    // Reset styles
    if (this.sheetContainer) {
      const sheet = this.sheetContainer.nativeElement;
      sheet.style.transition = '';
      sheet.style.transform = '';
    }
    
    const currentState = this.bottomSheetService.currentState();
    
    // Determinar nuevo estado basado en la dirección y distancia del arrastre
    if (Math.abs(deltaY) > threshold) {
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

  onHeaderClick() {
    // Click en el header para ciclar entre estados: compact → medium → expanded → compact
    const current = this.bottomSheetService.currentState();
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
      setTimeout(() => this.scrollToBottom(), 100);
    });

    // Suscribirse al indicador de escritura
    this.typingSubscription = this.chatService.typing$.subscribe(typing => {
      this.isTyping = typing;
      if (typing) {
        setTimeout(() => this.scrollToBottom(), 100);
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
    const currentState = this.bottomSheetService.currentState();
    if (currentState === 'compact') {
      this.bottomSheetService.setState('medium');
    }
    
    this.router.navigate([route]);
  }

  async handleQuickAction(action: string): Promise<void> {
    // Enviar la acción al chat
    await this.chatService.sendMessage(action);
    // Mantener expandido para mostrar la respuesta
  }

  async sendMessage(input: HTMLInputElement) {
    const message = input.value.trim();
    if (message) {
      // Limpiar input inmediatamente
      input.value = '';
      
      // Enviar mensaje usando el servicio de chat (conecta a n8n)
      await this.chatService.sendMessage(message);
      
      // Si está en estado compacto, expandir para ver la respuesta
      if (this.bottomSheetService.currentState() === 'compact') {
        this.bottomSheetService.setState('expanded');
      }
    }
  }

  onBackdropClick() {
    // Si está expandido, colapsar a compacto al hacer click en el backdrop
    if (this.bottomSheetService.currentState() === 'expanded') {
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
}
