// Ejemplo de uso del Bottom Sheet Service en el Dashboard
// Puedes agregar este código en dashboard.component.ts para controlar el chat

import { Component } from '@angular/core';
import { BottomSheetService } from '../../service/bottom-sheet.service';

@Component({
  selector: 'app-dashboard-example',
  template: `
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      
      <!-- Botón de ejemplo para abrir el chat desde el dashboard -->
      <button 
        class="open-chat-btn"
        (click)="openChat()"
        *ngIf="!isChatOpen()">
        💬 Abrir Chat
      </button>
    </div>

    <!-- El contenido del dashboard sigue aquí -->
    <div class="dashboard-content">
      <!-- Tus gráficas, tablas, etc. -->
    </div>
  `,
  styles: [`
    .open-chat-btn {
      position: fixed;
      bottom: 120px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #10B981;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      cursor: pointer;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 8;
      transition: all 0.3s ease;
      
      &:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
      }
      
      &:active {
        transform: scale(0.95);
      }
      
      // Solo visible en móvil
      @media (min-width: 768px) {
        display: none;
      }
    }
  `]
})
export class DashboardExampleComponent {
  
  constructor(private bottomSheetService: BottomSheetService) {}

  /**
   * Abre el chat en estado medio o expandido
   */
  openChat() {
    this.bottomSheetService.setState('medium');
  }

  /**
   * Verifica si el chat está en estado compacto (cerrado)
   */
  isChatOpen(): boolean {
    return !this.bottomSheetService.isCompact();
  }

  /**
   * Cierra el chat (lo colapsa al estado compacto)
   */
  closeChat() {
    this.bottomSheetService.collapse();
  }

  /**
   * Ejemplo: Abrir el chat con un mensaje predefinido
   */
  askQuestion(question: string) {
    // 1. Expandir el chat
    this.bottomSheetService.setState('medium');
    
    // 2. Aquí podrías enviar el mensaje al servicio de chat
    // this.chatService.sendMessage(question);
    
    console.log('Pregunta enviada:', question);
  }

  /**
   * Ejemplo de uso en respuesta a acciones del usuario
   */
  onViewInvoice(invoiceId: string) {
    // El usuario hace click en una factura
    // Podemos abrir el chat para mostrar detalles
    this.askQuestion(`Muéstrame los detalles de la factura ${invoiceId}`);
  }

  onAnalyzeData() {
    // Abrir chat para análisis de datos
    this.askQuestion('¿Puedes analizar mis datos de ventas del último mes?');
  }

  onGetHelp() {
    // Abrir ayuda contextual
    this.bottomSheetService.setState('expanded');
    // Aquí podrías cargar contenido de ayuda específico
  }
}

/**
 * CASOS DE USO RECOMENDADOS:
 * 
 * 1. Quick Actions desde el Dashboard:
 *    - Usuario hace click en una gráfica → Abre chat con contexto
 *    - Usuario selecciona una tabla → Pregunta sobre esos datos
 * 
 * 2. Notificaciones:
 *    - Llega una nueva factura → Expandir chat con notificación
 *    - Error en procesamiento → Mostrar ayuda en el chat
 * 
 * 3. Tutoriales/Onboarding:
 *    - Primera vez en la app → Chat expandido con tutorial
 *    - Nueva función disponible → Abrir chat para explicar
 * 
 * 4. Contexto Inteligente:
 *    - Usuario está en página de facturas → Chat sugiere acciones relacionadas
 *    - Usuario busca algo → Chat ofrece ayuda proactiva
 */

// ============================================
// INTEGRACIÓN CON SERVICIOS EXISTENTES
// ============================================

/**
 * Ejemplo de servicio que podría trabajar con el Bottom Sheet
 */
/*
@Injectable({ providedIn: 'root' })
export class ChatIntegrationService {
  
  constructor(
    private bottomSheet: BottomSheetService,
    private chatService: YourChatService
  ) {
    // Suscribirse a eventos del chat
    this.chatService.onNewMessage$.subscribe(message => {
      // Cuando llega un mensaje nuevo, expandir el chat si está colapsado
      if (this.bottomSheet.isCompact()) {
        this.bottomSheet.setState('medium');
      }
    });
  }

  sendMessageAndExpand(message: string) {
    this.bottomSheet.setState('medium');
    this.chatService.sendMessage(message);
  }

  closeOnComplete() {
    // Colapsar el chat cuando una tarea se complete
    this.bottomSheet.collapse();
  }
}
*/

// ============================================
// EJEMPLO DE INTEGRACIÓN CON ROUTER
// ============================================

/**
 * Puedes controlar el estado del bottom sheet basado en la ruta
 */
/*
export class AppComponent {
  constructor(
    private router: Router,
    private bottomSheet: BottomSheetService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Colapsar el chat en cada cambio de ruta
      this.bottomSheet.collapse();
      
      // O expandir en rutas específicas
      if (event.url.includes('/help')) {
        this.bottomSheet.setState('expanded');
      }
    });
  }
}
*/
