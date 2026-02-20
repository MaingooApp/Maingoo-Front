import { Component, ChangeDetectionStrategy, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { NgxPermissionsService } from 'ngx-permissions';

/**
 * Interfaz para los enlaces rápidos del menú
 */
export interface QuickLink {
  label: string;
  icon: string;
  route: string;
  comingSoon?: boolean;
  permissions?: string[];
}

/**
 * SidebarMenuComponent
 *
 * Componente que muestra el menú de navegación rápida del sidebar:
 * - Píldoras/chips de navegación
 * - Indicador de funcionalidades "coming soon"
 * - Etiquetas de sección (Menú / Maingoo AI)
 */
@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar-menu.component.html'
})
export class SidebarMenuComponent {
  private permissionsService = inject(NgxPermissionsService);

  /** Lista de enlaces rápidos para el menú */
  @Input() quickLinks: QuickLink[] = [];

  /** Links filtrados por permisos del usuario */
  get filteredLinks(): QuickLink[] {
    return this.quickLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) return true;
      return link.permissions.every((p) => !!this.permissionsService.getPermission(p));
    });
  }
}
