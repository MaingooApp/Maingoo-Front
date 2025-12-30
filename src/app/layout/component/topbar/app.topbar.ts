// - Component: decorador para declarar un componente Angular
import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
// - MenuItem: interfaz de PrimeNG para items de menú (no usada explícitamente en template
//   pero preservada para posibles futuras ampliaciones)
import { MenuItem } from 'primeng/api';
// - Router, RouterModule: navegación y directivas de enrutamiento
import { Router, RouterModule } from '@angular/router';
// - CommonModule: directivas comunes (ngIf, ngFor, etc.) necesarias para componentes standalone
import { CommonModule } from '@angular/common';
// - StyleClassModule: módulo de PrimeNG para animaciones/estilos que usa pStyleClass
import { StyleClassModule } from 'primeng/styleclass';
// - TooltipModule: módulo de PrimeNG para mostrar tooltips en los botones
import { TooltipModule } from 'primeng/tooltip';
// - AppConfigurator: componente hijo que maneja la configuración visual (tema, colores)
import { AppConfigurator } from '../configurator/app.configurator';
// - LayoutService: servicio compartido que controla el estado del layout (sidebar, tema, etc.)
import { LayoutService } from '../../service/layout.service';
// - AuthService: servicio de autenticación que expone métodos como logout()
import { AuthService } from '../../../features/auth/services/auth-service.service';
// - ToastService: servicio para gestionar notificaciones toast
import { ToastService } from '../../../shared/services/toast.service';
// - Subscription: para manejar suscripciones a observables
import { Subscription } from 'rxjs';

// Importar BottomSheetService para controlar el bottom sheet en móvil
import { BottomSheetService } from '../../service/bottom-sheet.service';

// Importaciones principales de Angular y PrimeNG usadas en este componente
@Component({
  // Selector del componente usado en plantillas: <app-topbar></app-topbar>
  selector: 'app-topbar',
  // Este es un componente standalone (Angular 14+). Se declaran los módulos/componentes
  // que necesita en la propiedad `imports` en lugar de importarlos desde un NgModule.
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule, TooltipModule],
  // Template externo: se usa un archivo HTML separado para mejor organización
  templateUrl: './app.topbar.html'
})
export class AppTopbar implements OnInit, OnDestroy {
  // Propiedad para ítems de menú si en el futuro se quiere poblar dinámicamente.
  items!: MenuItem[];

  // Indica si hay notificaciones sin leer
  hasUnreadNotifications = false;

  // Contador de notificaciones
  notificationCount = 0;

  // Lista de notificaciones
  notifications: any[] = [];

  // Estado del menú móvil
  isMobileMenuOpen = false;

  // Detectar si es móvil
  get isMobile(): boolean {
    return window.innerWidth < 768;
  }

  get userName(): string | undefined {
    return this.authService.currentUser?.name;
  }

  // Suscripción a las notificaciones
  private notificationSubscription?: Subscription;
  private notificationsListSubscription?: Subscription;

  // Injectamos servicios usados por el topbar:
  // - layoutService: controla el estado del layout (sidebar abierto, tema, etc.)
  // - authService: provee métodos de autenticación, p.ej. logout()
  // - router: para navegar programáticamente (después del logout se redirige al login)
  // - toastService: para suscribirse a las notificaciones
  // - elementRef: para detectar clicks fuera del menú móvil
  constructor(
    public layoutService: LayoutService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private elementRef: ElementRef,
    private bottomSheetService: BottomSheetService
  ) { }

  ngOnInit() {
    // Suscribirse a las notificaciones de toast
    this.notificationSubscription = this.toastService.notification$.subscribe(() => {
      this.hasUnreadNotifications = true;
      this.notificationCount++;
    });

    // Suscribirse al historial de notificaciones
    this.notificationsListSubscription = this.toastService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  ngOnDestroy() {
    // Limpiar suscripciones
    this.notificationSubscription?.unsubscribe();
    this.notificationsListSubscription?.unsubscribe();
  }

  // HostListener para cerrar el menú móvil cuando se hace click fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      if (this.isMobileMenuOpen) {
        this.isMobileMenuOpen = false;
      }
      if (this.layoutService.isProfilePanelActive()) {
        this.layoutService.toggleProfilePanel();
      }
    }
  }

  toggleProfile() {
    this.layoutService.toggleProfilePanel();
  }

  // toggleDarkMode: alterna el tema oscuro en el estado global del layout.
  // Usa una función de actualización inmutable sobre layoutService.layoutConfig
  // (asumiendo que layoutConfig es un signal/observable con método update).
  toggleDarkMode() {
    this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
  }

  // toggleNotifications: método para mostrar/ocultar el panel de notificaciones
  // Limpia el contador y el indicador visual cuando se abre
  toggleNotifications() {
    this.layoutService.toggleNotificationPanel();

    if (this.layoutService.isNotificationPanelActive()) {
      // Limpiar notificaciones no leídas al abrir el panel
      this.hasUnreadNotifications = false;
      this.notificationCount = 0;
    }
  }

  // getSeverityIcon: obtiene el icono según el tipo de notificación
  getSeverityIcon(severity: string): string {
    const icons: { [key: string]: string } = {
      success: 'pi-check-circle',
      info: 'pi-info-circle',
      warn: 'pi-exclamation-triangle',
      error: 'pi-times-circle'
    };
    return icons[severity] || 'pi-info-circle';
  }

  // getSeverityColor: obtiene el color según el tipo de notificación
  getSeverityColor(severity: string): string {
    const colors: { [key: string]: string } = {
      success: 'text-green-600',
      info: 'text-blue-600',
      warn: 'text-orange-600',
      error: 'text-red-600'
    };
    return colors[severity] || 'text-gray-600';
  }

  // formatTime: formatea el timestamp de la notificación
  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }

  // clearAllNotifications: limpia todas las notificaciones
  clearAllNotifications() {
    this.toastService.clearNotifications();
  }

  // toggleMobileMenu: alterna el menú desplegable móvil en escritorio
  // En móvil, controla el bottom sheet (abre a medium o cierra a compact)
  toggleMobileMenu() {
    if (this.isMobile) {
      // En móvil: controlar el bottom sheet
      const currentState = this.bottomSheetService.currentState();
      if (currentState === 'compact') {
        // Si está cerrado, abrir a medium
        this.bottomSheetService.setState('medium');
      } else {
        // Si está en medium o expanded, cerrar a compact
        this.bottomSheetService.setState('compact');
      }
    } else {
      // En escritorio: toggle del menú desplegable
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }
  }

  // openSettings: método para abrir el panel de configuración del sistema
  openSettings() {
    // TODO: Implementar lógica para abrir panel de configuración
    console.log('Configuración clickeada');
  }

  // logout: llama a authService.logout() y luego navega a la página de login.
  // Nota: authService.logout() debería encargarse de limpiar tokens/localStorage.
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
