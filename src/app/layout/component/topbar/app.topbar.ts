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
import { RippleModule } from 'primeng/ripple';
// - AppConfigurator: componente hijo que maneja la configuración visual (tema, colores)
import { AppConfigurator } from '../configurator/app.configurator';
// - IconComponent: componente de iconos Material Symbols
import { IconComponent } from '../../../shared/components/icon/icon.component';
// - TopbarShellComponent: contenedor visual del topbar (posición, fondo, bordes)
import { TopbarShellComponent } from './topbar-shell/topbar-shell.component';
// - TopbarLeftWelcomeComponent: sección izquierda con logo y mensaje de bienvenida
import { TopbarLeftWelcomeComponent } from './topbar-left-welcome/topbar-left-welcome.component';
import { TopbarRightButtonsComponent } from './topbar-right-buttons/topbar-right-buttons.component';
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

import { EnterpriseService, Enterprise } from '../../../features/enterprise/services/enterprise.service';
import { AngleDoubleDownIcon } from "primeng/icons";

// Importaciones principales de Angular y PrimeNG usadas en este componente
@Component({
  // Selector del componente usado en plantillas: <app-topbar></app-topbar>
  selector: 'app-topbar',
  // Este es un componente standalone (Angular 14+). Se declaran los módulos/componentes
  // que necesita en la propiedad `imports` en lugar de importarlos desde un NgModule.
  standalone: true,
  imports: [CommonModule, TopbarShellComponent, TopbarLeftWelcomeComponent, TopbarRightButtonsComponent],
  // Template externo: se usa un archivo HTML separado para mejor organización
  templateUrl: './app.topbar.html',
})
export class AppTopbar implements OnInit, OnDestroy {
  // Propiedad para ítems de menú si en el futuro se quiere poblar dinámicamente.
  items!: MenuItem[];

  // Información de la empresa
  enterprise: Enterprise | null = null;

  get userName(): string | undefined {
    return this.authService.currentUser?.name;
  }

  get businessName(): string {
    return this.enterprise?.name || 'Tu Negocio';
  }

  get businessType(): string {
    if (!this.enterprise?.type) return '';

    const types: Record<string, string> = {
      'RESTAURANT': 'Restaurante',
      'CATERING': 'Catering',
      'HOTEL': 'Hotel',
      'OTHER': 'Otro'
    };

    return types[this.enterprise.type] || this.enterprise.type;
  }

  // Injectamos servicios usados por el topbar:
  // - layoutService: controla el estado del layout (sidebar abierto, tema, etc.)
  // - authService: provee métodos de autenticación, p.ej. logout()
  // - router: para navegar programáticamente (después del logout se redirige al login)
  // - enterpriseService: para cargar datos de la empresa
  constructor(
    public layoutService: LayoutService,
    private authService: AuthService,
    private router: Router,
    private enterpriseService: EnterpriseService
  ) { }

  ngOnInit() {
    // Cargar información de la empresa
    const enterpriseId = this.authService.getEnterpriseId();
    if (enterpriseId) {
      this.enterpriseService.getEnterpriseById(enterpriseId).subscribe({
        next: (enterprise) => {
          this.enterprise = enterprise;
        },
        error: (err) => console.error('Error loading enterprise info:', err)
      });
    }
  }

  ngOnDestroy() {
    // Limpieza si es necesaria
  }

  // logout: llama a authService.logout() y luego navega a la página de login.
  // Nota: authService.logout() debería encargarse de limpiar tokens/localStorage.
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
