import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/icon/icon.component';
import { NotificationItem } from '@core/services/notification.service';

/**
 * SidebarNotificationsComponent
 *
 * Componente que muestra las notificaciones dentro del sidebar:
 * - Lista de notificaciones con estados
 * - Estado vacío cuando no hay notificaciones
 * - Botón para limpiar todas
 */
@Component({
  selector: 'app-sidebar-notifications',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar-notifications.component.html'
})
export class SidebarNotificationsComponent {
  /** Lista de notificaciones */
  @Input() notifications: NotificationItem[] = [];

  @Output() markAllRead = new EventEmitter<void>();
  @Output() notificationSelected = new EventEmitter<NotificationItem>();

  /**
   * Obtiene el icono Material Symbol según la severidad
   */
  getPriorityIcon(priority: NotificationItem['priority']): string {
    const icons: { [key: string]: string } = {
      INFO: 'info',
      WARNING: 'warning',
      CRITICAL: 'error'
    };
    return icons[priority] || 'info';
  }

  /**
   * Formatea el timestamp de la notificación
   */
  formatTime(timestamp: string): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAllNotifications(): void {
    this.markAllRead.emit();
  }

  selectNotification(notification: NotificationItem): void {
    this.notificationSelected.emit(notification);
  }
}
