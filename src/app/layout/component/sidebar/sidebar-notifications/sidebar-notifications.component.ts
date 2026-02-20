import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Interfaz para las notificaciones
 */
export interface SidebarNotification {
	id: string;
	severity: 'success' | 'info' | 'warn' | 'error';
	summary: string;
	detail?: string;
	timestamp: Date;
}

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
	@Input() notifications: SidebarNotification[] = [];

	/** Evento para limpiar todas las notificaciones */
	@Output() clearAll = new EventEmitter<void>();

	/**
	 * Obtiene el icono Material Symbol según la severidad
	 */
	getSeverityIcon(severity: string): string {
		const icons: { [key: string]: string } = {
			success: 'check_circle',
			info: 'info',
			warn: 'warning',
			error: 'cancel'
		};
		return icons[severity] || 'info';
	}

	/**
	 * Formatea el timestamp de la notificación
	 */
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

	/**
	 * Limpia todas las notificaciones
	 */
	clearAllNotifications(): void {
		this.clearAll.emit();
	}
}
