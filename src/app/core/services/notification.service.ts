import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '@env/environment';
import { EMPTY, Observable, catchError, finalize, map, tap } from 'rxjs';

import { BaseHttpService } from './base-http.service';

export interface NotificationItem {
  id: string;
  type: string;
  priority: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  body: string;
  actionPath?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService extends BaseHttpService {
  private readonly API_URL = `${environment.urlBackend}api/notifications`;

  readonly items = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);

  constructor(http: HttpClient) {
    super(http);
  }

  refresh(): Observable<void> {
    this.loading.set(true);
    return this.get<NotificationsResponse>(this.API_URL).pipe(
      tap(({ items, unreadCount }) => {
        this.items.set(items);
        this.unreadCount.set(unreadCount);
      }),
      map(() => undefined),
      catchError(() => EMPTY),
      finalize(() => this.loading.set(false))
    );
  }

  markRead(id: string): Observable<void> {
    return this.patch<NotificationItem>(`${this.API_URL}/${id}/read`, {}).pipe(
      tap((updated) => {
        this.items.update((items) => items.map((item) => (item.id === id ? updated : item)));
        this.unreadCount.update((count) => Math.max(0, count - 1));
      }),
      map(() => undefined)
    );
  }

  markAllRead(): Observable<void> {
    return this.patch<{ updated: number }>(`${this.API_URL}/read-all`, {}).pipe(
      tap(() => {
        const readAt = new Date().toISOString();
        this.items.update((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
        this.unreadCount.set(0);
      }),
      map(() => undefined)
    );
  }
}
