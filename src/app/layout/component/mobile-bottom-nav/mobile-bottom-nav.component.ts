import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { BottomSheetService } from '../../service/bottom-sheet.service';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  action: 'navigate' | 'chat' | 'menu';
  route?: string;
}

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrls: ['./mobile-bottom-nav.component.scss']
})
export class MobileBottomNavComponent {
  navItems: NavItem[] = [
    { label: 'Inicio', icon: 'pi pi-home', action: 'navigate', route: '/' },
    { label: 'Chat', icon: 'pi pi-sparkles', action: 'chat' },
    { label: 'Menú', icon: 'pi pi-bars', action: 'menu' },
    { label: 'Perfil', icon: 'pi pi-user', action: 'navigate', route: '/miperfil' }
  ];

  currentRoute: string = '/';

  constructor(
    private router: Router,
    private bottomSheetService: BottomSheetService
  ) {
    // Escuchar cambios de ruta para actualizar el estado activo
    this.currentRoute = this.router.url.split('?')[0].split('#')[0];

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects.split('?')[0].split('#')[0];
    });
  }

  handleNavClick(item: NavItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    switch (item.action) {
      case 'navigate':
        if (item.route) {
          // Cerrar cualquier modal abierto antes de navegar
          this.bottomSheetService.closeAll();
          this.router.navigate([item.route]);
        }
        break;

      case 'chat':
        this.bottomSheetService.openChat();
        break;

      case 'menu':
        this.bottomSheetService.openMenu();
        break;
    }
  }

  isActive(item: NavItem): boolean {
    if (item.action !== 'navigate' || !item.route) {
      return false;
    }

    // Exact match para home
    if (item.route === '/') {
      return this.currentRoute === '/';
    }

    // Prefix match para otras rutas
    return this.currentRoute.startsWith(item.route);
  }

  isChatActive(): boolean {
    return this.bottomSheetService.isChatOpen();
  }

  isMenuActive(): boolean {
    return this.bottomSheetService.isMenuOpen();
  }
}
