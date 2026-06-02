import { Component, DestroyRef, signal, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../service/layout.service';
import { NotificationItem, ToastService } from '@shared/services/toast.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SidebarShellComponent } from './sidebar-shell/sidebar-shell.component';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { SidebarChatComponent } from './sidebar-chat/sidebar-chat.component';
import {
  SidebarNotification,
  SidebarNotificationsComponent
} from './sidebar-notifications/sidebar-notifications.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarShellComponent,
    SidebarMenuComponent,
    SidebarChatComponent,
    SidebarNotificationsComponent,
    IconComponent
  ],
  templateUrl: './app.sidebar.html'
})
export class AppSidebar implements OnInit {
  private destroyRef = inject(DestroyRef);

  // Tab activo: 'chat' o 'notifications'
  activeTab = signal<'chat' | 'notifications'>('chat');

  // Notificaciones
  notifications: SidebarNotification[] = [];

  // Acciones rápidas (Menú de navegación)
  quickLinks = [
    { label: 'Dashboard', icon: 'monitoring', route: '/' },
    { label: 'Proveedores', icon: 'local_shipping', route: '/proveedores', permissions: ['suppliers.read'] },
    { label: 'Almacén', icon: 'warehouse', route: '/productos', permissions: ['products.read'] },
    { label: 'Artículos', icon: 'restaurant', route: '/articulos', permissions: ['products.read'] },
    /*
    { label: 'Ventas', icon: 'payments', route: '/ventas', comingSoon: true },
    { label: 'Equípo', icon: 'group', route: '/rrhh', comingSoon: true },
    */
    { label: 'Gestoría', icon: 'description', route: '/gestoria' },
    { label: 'Sanidad', icon: 'shield', route: '/appcc' },
    {
      label: 'Usuarios',
      icon: 'manage_accounts',
      route: '/usuarios',
      permissions: ['users.read', 'permissions.assign']
    }
  ];

  constructor(
    public layoutService: LayoutService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Suscribirse a las notificaciones
    this.toastService.notifications$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((notifications) => {
      this.notifications = notifications.map((notification) => ({
        ...notification,
        severity: this.toSidebarSeverity(notification.severity)
      }));
    });
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

  private toSidebarSeverity(severity: NotificationItem['severity']): SidebarNotification['severity'] {
    return severity === 'success' || severity === 'warn' || severity === 'error' ? severity : 'info';
  }
}
