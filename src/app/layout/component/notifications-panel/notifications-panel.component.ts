import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../shared/services/toast.service';
import { LayoutService } from '../../service/layout.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-panel.component.html'
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  private notificationsListSubscription?: Subscription;

  constructor(
    private toastService: ToastService,
    public layoutService: LayoutService
  ) {}

  ngOnInit() {
    // Suscribirse al historial de notificaciones
    this.notificationsListSubscription = this.toastService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  ngOnDestroy() {
    this.notificationsListSubscription?.unsubscribe();
  }

  getSeverityIcon(severity: string): string {
    const icons: { [key: string]: string } = {
      success: 'pi-check-circle',
      info: 'pi-info-circle',
      warn: 'pi-exclamation-triangle',
      error: 'pi-times-circle'
    };
    return icons[severity] || 'pi-info-circle';
  }

  getSeverityColor(severity: string): string {
    const colors: { [key: string]: string } = {
      success: 'text-green-600',
      info: 'text-blue-600',
      warn: 'text-orange-600',
      error: 'text-red-600'
    };
    return colors[severity] || 'text-gray-600';
  }

  formatTime(timestamp: Date): string {
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

  clearAllNotifications() {
    this.toastService.clearNotifications();
  }
}
