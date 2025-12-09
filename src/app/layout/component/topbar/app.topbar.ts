// - Component: decorador para declarar un componente Angular
import { Component } from '@angular/core';
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
import { AppConfigurator } from '../app.configurator';
// - LayoutService: servicio compartido que controla el estado del layout (sidebar, tema, etc.)
import { LayoutService } from '../../service/layout.service';
// - AuthService: servicio de autenticación que expone métodos como logout()
import { AuthService } from '../../../features/auth/services/auth-service.service';

// Importaciones principales de Angular y PrimeNG usadas en este componente
@Component({
  // Selector del componente usado en plantillas: <app-topbar></app-topbar>
  selector: 'app-topbar',
  // Este es un componente standalone (Angular 14+). Se declaran los módulos/componentes
  // que necesita en la propiedad `imports` en lugar de importarlos desde un NgModule.
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule, TooltipModule, AppConfigurator],
  // Template externo: se usa un archivo HTML separado para mejor organización
  templateUrl: './app.topbar.html'
})
export class AppTopbar {
  // Propiedad para ítems de menú si en el futuro se quiere poblar dinámicamente.
  items!: MenuItem[];

  // Injectamos servicios usados por el topbar:
  // - layoutService: controla el estado del layout (sidebar abierto, tema, etc.)
  // - authService: provee métodos de autenticación, p.ej. logout()
  // - router: para navegar programáticamente (después del logout se redirige al login)
  constructor(
    public layoutService: LayoutService,
    private authService: AuthService,
    private router: Router
  ) {}

  // toggleDarkMode: alterna el tema oscuro en el estado global del layout.
  // Usa una función de actualización inmutable sobre layoutService.layoutConfig
  // (asumiendo que layoutConfig es un signal/observable con método update).
  toggleDarkMode() {
    this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
  }

  // toggleNotifications: método para mostrar/ocultar el panel de notificaciones
  // En este momento solo se crea el método, la funcionalidad completa se implementará después
  toggleNotifications() {
    // TODO: Implementar lógica para mostrar panel de notificaciones o toast
    console.log('Notificaciones clickeadas');
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
