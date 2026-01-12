import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomSheetService } from '../../service/bottom-sheet.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-mobile-menu-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-menu-modal.component.html',
  styleUrls: ['./mobile-menu-modal.component.scss']
})
export class MobileMenuModalComponent {
  menuItems: MenuItem[] = [
    { label: 'Métricas', icon: 'pi pi-chart-line', route: '/' },
    { label: 'Proveedores', icon: 'pi pi-truck', route: '/proveedores' },
    { label: 'Mi almacén', icon: 'pi pi-warehouse', route: '/productos' },
    { label: 'Artículos', icon: 'pi pi-clipboard', route: '/articulos' },
    { label: 'Docs', icon: 'pi pi-file-edit', route: '/docgenerator' },
    { label: 'Facturas', icon: 'pi pi-file', route: '/facturas' }
  ];

  constructor(
    private router: Router,
    public bottomSheetService: BottomSheetService
  ) {}

  get isOpen(): boolean {
    return this.bottomSheetService.isMenuOpen();
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
