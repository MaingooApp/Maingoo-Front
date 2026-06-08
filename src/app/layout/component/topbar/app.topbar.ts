import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TopbarShellComponent } from './topbar-shell/topbar-shell.component';
import { TopbarLeftWelcomeComponent } from './topbar-left-welcome/topbar-left-welcome.component';
import { TopbarRightButtonsComponent } from './topbar-right-buttons/topbar-right-buttons.component';
import { LayoutService } from '../../service/layout.service';
import { AuthService } from '../../../features/auth/services/auth-service.service';
import { EnterpriseService, Enterprise } from '../../../features/enterprise/services/enterprise.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, TopbarShellComponent, TopbarLeftWelcomeComponent, TopbarRightButtonsComponent],
  templateUrl: './app.topbar.html'
})
export class AppTopbar implements OnInit {
  private destroyRef = inject(DestroyRef);

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
      RESTAURANT: 'Restaurante',
      CATERING: 'Catering',
      HOTEL: 'Hotel',
      OTHER: 'Otro'
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
  ) {}

  ngOnInit() {
    // Cargar información de la empresa
    const enterpriseId = this.authService.getEnterpriseId();
    if (enterpriseId) {
      this.enterpriseService
        .getEnterpriseById(enterpriseId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (enterprise) => {
            this.enterprise = enterprise;
          },
          error: () => {
            this.enterprise = null;
          }
        });
    }
  }

  // logout: llama a authService.logout() y luego navega a la página de login.
  // Nota: authService.logout() debería encargarse de limpiar tokens/localStorage.
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
