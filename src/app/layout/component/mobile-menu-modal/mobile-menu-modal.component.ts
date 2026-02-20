import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomSheetService } from '../../service/bottom-sheet.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { NgxPermissionsService } from 'ngx-permissions';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  permissions?: string[];
}

@Component({
  selector: 'app-mobile-menu-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './mobile-menu-modal.component.html',
  styleUrls: ['./mobile-menu-modal.component.scss']
})
export class MobileMenuModalComponent {
  menuItems: MenuItem[] = [
    { label: 'Métricas', icon: 'monitoring', route: '/' },
    { label: 'Proveedores', icon: 'local_shipping', route: '/proveedores', permissions: ['suppliers.read'] },
    { label: 'Mi almacén', icon: 'warehouse', route: '/productos', permissions: ['products.read'] },
    { label: 'Artículos', icon: 'restaurant', route: '/articulos', permissions: ['products.read'] },
    { label: 'Docs', icon: 'description', route: '/gestoria' },
    { label: 'Facturas', icon: 'receipt_long', route: '/facturas', permissions: ['invoices.read'] },
    {
      label: 'Usuarios',
      icon: 'manage_accounts',
      route: '/usuarios',
      permissions: ['users.read', 'permissions.assign']
    }
  ];

  private permissionsService = inject(NgxPermissionsService);

  constructor(
    private router: Router,
    public bottomSheetService: BottomSheetService
  ) {}

  get isOpen(): boolean {
    return this.bottomSheetService.isMenuOpen();
  }

  get filteredMenuItems(): MenuItem[] {
    return this.menuItems.filter((item) => {
      if (!item.permissions || item.permissions.length === 0) return true;
      return item.permissions.every((p) => !!this.permissionsService.getPermission(p));
    });
  }

  close(): void {
    this.bottomSheetService.closeMenu();
  }

  navigateTo(route: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Cerrar el modal
    this.close();

    // Navegar con un pequeño delay para animación suave
    setTimeout(() => {
      this.router.navigate([route]);
    }, 150);
  }

  onBackdropClick(event: Event): void {
    // Solo cerrar si se hace click en el backdrop, no en el contenido
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
