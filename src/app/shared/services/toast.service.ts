import { Injectable } from '@angular/core';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { Subject, BehaviorSubject } from 'rxjs';

export interface NotificationItem {
  id: string;
  severity: string;
  summary: string;
  detail?: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly defaultLife = 3000;
  private readonly maxNotifications = 20; // Máximo de notificaciones a almacenar
  
  // Observable para notificar cuando se muestra un toast
  private notificationSubject = new Subject<void>();
  public notification$ = this.notificationSubject.asObservable();
  
  // Almacenar historial de notificaciones
  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private messageService: MessageService) {}

  show(options: ToastMessageOptions): void {
    this.messageService.add({
      ...options,
      life: options.life ?? this.defaultLife
    });
    
    // Crear item de notificación
    const notification: NotificationItem = {
      id: Date.now().toString(),
      severity: options.severity || 'info',
      summary: options.summary || '',
      detail: options.detail,
      timestamp: new Date()
    };
    
    // Añadir al historial (mantener solo las últimas maxNotifications)
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [notification, ...currentNotifications].slice(0, this.maxNotifications);
    this.notificationsSubject.next(updatedNotifications);
    
    // Emitir evento de notificación
    this.notificationSubject.next();
  }
  
  getNotifications(): NotificationItem[] {
    return this.notificationsSubject.value;
  }
  
  clearNotifications(): void {
    this.notificationsSubject.next([]);
  }

  success(summary: string, detail?: string, life?: number): void {
    this.show({ severity: 'success', summary, detail, life });
  }

  info(summary: string, detail?: string, life?: number): void {
    this.show({ severity: 'info', summary, detail, life });
  }

  warn(summary: string, detail?: string, life?: number): void {
    this.show({ severity: 'warn', summary, detail, life });
  }

  error(summary: string, detail?: string, life?: number): void {
    this.show({ severity: 'error', summary, detail, life });
  }

  clear(key?: string): void {
    this.messageService.clear(key);
  }
}
