import { Component, ElementRef, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../service/layout.service';
import { ToastService } from '@shared/services/toast.service';
import { Subscription } from 'rxjs';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SidebarShellComponent } from './sidebar-shell/sidebar-shell.component';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { SidebarChatComponent } from './sidebar-chat/sidebar-chat.component';
import { SidebarNotificationsComponent } from './sidebar-notifications/sidebar-notifications.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarShellComponent, SidebarMenuComponent, SidebarChatComponent, SidebarNotificationsComponent, IconComponent],
  templateUrl: './app.sidebar.html',
})
export class AppSidebar implements OnInit, OnDestroy {
  // Tab activo: 'chat' o 'notifications'
  activeTab = signal<'chat' | 'notifications'>('chat');

  // Notificaciones
  notifications: any[] = [];
  private notificationsSubscription?: Subscription;

  // Acciones rápidas (Menú de navegación)
  quickLinks = [
    { label: 'Dashboard', icon: 'monitoring', route: '/' },
    { label: 'Proveedores', icon: 'local_shipping', route: '/proveedores' },
    { label: 'Almacén', icon: 'warehouse', route: '/productos' },
    { label: 'Artículos', icon: 'restaurant', route: '/articulos' },
    { label: 'Ventas', icon: 'payments', route: '/ventas', comingSoon: true },
    { label: 'Equípo', icon: 'group', route: '/rrhh', comingSoon: true },
    { label: 'Gestoría', icon: 'description', route: '/gestoria' },
    { label: 'Sanidad', icon: 'shield', route: '/appcc', comingSoon: true },
    { label: 'Docs', icon: 'folder', route: '/documentos', comingSoon: true },
  ];

  constructor(
    public layoutService: LayoutService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Suscribirse a las notificaciones
    this.notificationsSubscription = this.toastService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  ngOnDestroy(): void {
    this.notificationsSubscription?.unsubscribe();
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAllNotifications(): void {
    this.toastService.clearNotifications();
  }

  /**
   * Cambia el tab activo
   */
  setActiveTab(tab: 'chat' | 'notifications'): void {
    this.activeTab.set(tab);
  }
}
