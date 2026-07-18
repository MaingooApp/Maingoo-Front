import { Component, DestroyRef, signal, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { exhaustMap, filter, fromEvent, merge, timer } from 'rxjs';
import { LayoutService } from '../../service/layout.service';
import { NotificationItem, NotificationService } from '@core/services/notification.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SidebarShellComponent } from './sidebar-shell/sidebar-shell.component';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { SidebarChatComponent } from './sidebar-chat/sidebar-chat.component';
import { AppPermission } from '@core/constants/permissions.enum';
import { SidebarNotificationsComponent } from './sidebar-notifications/sidebar-notifications.component';

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
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Tab activo: 'chat' o 'notifications'
  activeTab = signal<'chat' | 'notifications'>('chat');

  // Notificaciones
  notifications = this.notificationService.items;
  unreadNotifications = this.notificationService.unreadCount;

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
      label: 'Suscripcion',
      icon: 'credit_card',
      route: '/suscripcion',
      permissions: [AppPermission.BillingRead]
    },
    {
      label: 'Usuarios',
      icon: 'manage_accounts',
      route: '/usuarios',
      permissions: ['users.read', 'permissions.assign']
    }
  ];

  constructor(public layoutService: LayoutService) {}

  ngOnInit(): void {
    merge(timer(0, 120_000), fromEvent(window, 'focus'))
      .pipe(
        filter(() => document.visibilityState === 'visible'),
        exhaustMap(() => this.notificationService.refresh()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAllNotifications(): void {
    this.notificationService.markAllRead().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /**
   * Cambia el tab activo
   */
  setActiveTab(tab: 'chat' | 'notifications'): void {
    this.activeTab.set(tab);

    if (tab === 'notifications') {
      this.notificationService.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  openNotification(notification: NotificationItem): void {
    if (!notification.readAt) {
      this.notificationService.markRead(notification.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    if (notification.actionPath) {
      void this.router.navigateByUrl(notification.actionPath);
    }
  }
}
