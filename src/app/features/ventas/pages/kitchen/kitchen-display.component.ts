import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  exhaustMap,
  expand,
  filter,
  finalize,
  forkJoin,
  fromEvent,
  map,
  merge,
  of,
  reduce,
  tap,
  timer
} from 'rxjs';

import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

import { UpdateKitchenTicketCommandData } from '../../models/pos-command.models';
import {
  KitchenTicketListItem,
  KitchenTicketStatus,
  KitchenTicketUpdateResponse,
  PagedResponse,
  PosDevice
} from '../../models/pos.models';
import { KitchenTicketFilters, PosService } from '../../services/pos.service';

const DEVICE_STORAGE_KEY = 'maingoo-pos-kds-device-id';
const ACTIVE_STATUSES = ['QUEUED', 'IN_PROGRESS', 'READY'] as const;
const POLLING_INTERVAL_MS = 2000;
const PAGE_SIZE = 100;
const NEXT_STATUS: Partial<Record<KitchenTicketStatus, Exclude<KitchenTicketStatus, 'QUEUED'>>> = {
  QUEUED: 'IN_PROGRESS',
  IN_PROGRESS: 'READY',
  READY: 'SERVED'
};

type ActiveKitchenStatus = (typeof ACTIVE_STATUSES)[number];
type TicketWithOptionalVersion = KitchenTicketListItem & { version?: number };

interface KitchenStationGroup {
  id: string;
  name: string;
  sortOrder: number;
  ticketsByStatus: Record<ActiveKitchenStatus, KitchenTicketListItem[]>;
}

@Component({
  selector: 'app-kitchen-display',
  standalone: true,
  imports: [ButtonModule, CommonModule, FormsModule, SkeletonComponent, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kitchen-display.component.html'
})
export class KitchenDisplayComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly posService = inject(PosService);
  private readonly refreshRequested = new Subject<void>();

  readonly devices = signal<PosDevice[]>([]);
  readonly selectedDeviceId = signal('');
  readonly tickets = signal<KitchenTicketListItem[]>([]);
  readonly selectedStationId = signal('');
  readonly loadingDevices = signal(false);
  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly online = signal(navigator.onLine);
  readonly errorCode = signal<string | null>(null);
  readonly deviceErrorCode = signal<string | null>(null);
  readonly updatingTicketIds = signal<ReadonlySet<string>>(new Set());
  readonly now = signal(Date.now());
  readonly activeStatuses = ACTIVE_STATUSES;

  private cursor: string | null = null;

  readonly stationGroups = computed<KitchenStationGroup[]>(() => {
    const selectedStationId = this.selectedStationId();
    const groups = new Map<string, KitchenStationGroup>();

    for (const ticket of this.tickets()) {
      if (!this.isActiveStatus(ticket.status) || (selectedStationId && ticket.stationId !== selectedStationId))
        continue;

      const group = groups.get(ticket.stationId) ?? {
        id: ticket.stationId,
        name: ticket.station.name,
        sortOrder: ticket.station.sortOrder,
        ticketsByStatus: { QUEUED: [], IN_PROGRESS: [], READY: [] }
      };
      group.ticketsByStatus[ticket.status].push(ticket);
      groups.set(ticket.stationId, group);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        ticketsByStatus: {
          QUEUED: this.sortTickets(group.ticketsByStatus.QUEUED),
          IN_PROGRESS: this.sortTickets(group.ticketsByStatus.IN_PROGRESS),
          READY: this.sortTickets(group.ticketsByStatus.READY)
        }
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  });

  readonly stations = computed(() =>
    [...new Map(this.tickets().map((ticket) => [ticket.stationId, ticket.station])).values()].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
    )
  );

  ngOnInit(): void {
    this.loadDevices();
    this.setupConnectivity();
    this.setupPolling();
  }

  loadDevices(): void {
    this.loadingDevices.set(true);
    this.deviceErrorCode.set(null);
    this.posService
      .listDevices({ type: 'KDS', status: 'ACTIVE' })
      .pipe(
        finalize(() => this.loadingDevices.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (devices) => {
          this.devices.set(devices);
          const savedDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
          if (savedDeviceId && devices.some(({ id }) => id === savedDeviceId)) {
            this.selectedDeviceId.set(savedDeviceId);
            this.activateDevice();
          } else if (savedDeviceId) {
            localStorage.removeItem(DEVICE_STORAGE_KEY);
          }
        },
        error: (error: unknown) => this.deviceErrorCode.set(this.extractErrorCode(error, 'POS_DEVICE_LOAD_FAILED'))
      });
  }

  activateDevice(): void {
    const deviceId = this.selectedDeviceId();
    if (!deviceId) return;

    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    this.cursor = null;
    this.tickets.set([]);
    this.errorCode.set(null);
    this.loading.set(true);
    this.refreshRequested.next();
  }

  changeDevice(): void {
    localStorage.removeItem(DEVICE_STORAGE_KEY);
    this.selectedDeviceId.set('');
    this.cursor = null;
    this.tickets.set([]);
    this.errorCode.set(null);
    this.loading.set(false);
  }

  retry(): void {
    if (!this.selectedDeviceId()) return;
    this.loading.set(this.tickets().length === 0);
    this.refreshRequested.next();
  }

  transition(ticket: KitchenTicketListItem): void {
    const status = this.nextStatus(ticket.status);
    const deviceId = this.selectedDeviceId();
    if (!status || !deviceId || this.updatingTicketIds().has(ticket.id) || !this.online()) return;

    this.setUpdating(ticket.id, true);
    const command: UpdateKitchenTicketCommandData = {
      ticketId: ticket.id,
      status,
      deviceId,
      clientCreatedAt: new Date().toISOString()
    };

    this.posService
      .updateKitchenTicket(command, crypto.randomUUID())
      .pipe(
        finalize(() => this.setUpdating(ticket.id, false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updated) => {
          this.errorCode.set(null);
          this.mergeUpdatedTicket(updated);
          this.refreshRequested.next();
        },
        error: (error: unknown) => this.errorCode.set(this.extractErrorCode(error, 'KITCHEN_TICKET_UPDATE_FAILED'))
      });
  }

  nextStatus(status: KitchenTicketStatus): Exclude<KitchenTicketStatus, 'QUEUED'> | null {
    return NEXT_STATUS[status] ?? null;
  }

  ageMinutes(ticket: KitchenTicketListItem): number {
    return Math.max(0, Math.floor((this.now() - Date.parse(ticket.sentAt)) / 60000));
  }

  mergeTickets(incoming: KitchenTicketListItem[]): void {
    const merged = new Map(this.tickets().map((ticket) => [ticket.id, ticket]));

    for (const ticket of incoming) {
      const current = merged.get(ticket.id);
      if (!current || this.isNewer(ticket, current)) merged.set(ticket.id, ticket);
    }

    this.tickets.set([...merged.values()].filter((ticket) => this.isActiveStatus(ticket.status)));
  }

  private setupConnectivity(): void {
    merge(fromEvent(window, 'online').pipe(map(() => true)), fromEvent(window, 'offline').pipe(map(() => false)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((online) => {
        this.online.set(online);
        if (online) this.refreshRequested.next();
      });
  }

  private setupPolling(): void {
    const resumeEvents = merge(
      fromEvent(window, 'focus'),
      fromEvent(document, 'visibilitychange').pipe(filter(() => !document.hidden))
    );

    merge(timer(0, POLLING_INTERVAL_MS), resumeEvents, this.refreshRequested)
      .pipe(
        filter(() => !!this.selectedDeviceId() && this.online() && !document.hidden),
        tap(() => this.now.set(Date.now())),
        exhaustMap(() => this.poll()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private poll(): Observable<void> {
    this.refreshing.set(true);
    const request = this.cursor
      ? this.listAllPages({ updatedAfter: this.cursor })
      : forkJoin(ACTIVE_STATUSES.map((status) => this.listAllPages({ status }))).pipe(map((pages) => pages.flat()));

    return request.pipe(
      tap((tickets) => {
        this.mergeTickets(tickets);
        const latest = this.latestTimestamp(tickets);
        // Overlap one second; mergeTickets removes duplicates and equal timestamps cannot be skipped.
        if (latest) this.cursor = new Date(Date.parse(latest) - 1000).toISOString();
        this.errorCode.set(null);
        this.loading.set(false);
      }),
      map(() => undefined),
      catchError((error: unknown) => {
        this.errorCode.set(this.extractErrorCode(error, 'KITCHEN_TICKETS_LOAD_FAILED'));
        this.loading.set(false);
        return of(undefined);
      }),
      finalize(() => this.refreshing.set(false))
    );
  }

  private listAllPages(filters: KitchenTicketFilters): Observable<KitchenTicketListItem[]> {
    return this.posService.listKitchenTickets({ ...filters, page: 1, limit: PAGE_SIZE }).pipe(
      expand((page) =>
        page.nextPage
          ? this.posService.listKitchenTickets({ ...filters, page: page.nextPage, limit: PAGE_SIZE })
          : EMPTY
      ),
      reduce<PagedResponse<KitchenTicketListItem>, KitchenTicketListItem[]>(
        (tickets, page) => [...tickets, ...page.items],
        []
      )
    );
  }

  private mergeUpdatedTicket(updated: KitchenTicketUpdateResponse): void {
    const current = this.tickets().find(({ id }) => id === updated.id);
    if (!current) return;

    this.mergeTickets([
      {
        ...current,
        ...updated,
        order: { ...current.order, ...updated.order }
      }
    ]);
  }

  private isNewer(candidate: KitchenTicketListItem, current: KitchenTicketListItem): boolean {
    const candidateVersion = (candidate as TicketWithOptionalVersion).version;
    const currentVersion = (current as TicketWithOptionalVersion).version;
    if (candidateVersion !== undefined && currentVersion !== undefined && candidateVersion !== currentVersion) {
      return candidateVersion > currentVersion;
    }
    return Date.parse(candidate.updatedAt) >= Date.parse(current.updatedAt);
  }

  private latestTimestamp(tickets: KitchenTicketListItem[]): string | null {
    return tickets.reduce<string | null>(
      (latest, ticket) => (!latest || Date.parse(ticket.updatedAt) > Date.parse(latest) ? ticket.updatedAt : latest),
      null
    );
  }

  private isActiveStatus(status: KitchenTicketStatus): status is ActiveKitchenStatus {
    return ACTIVE_STATUSES.includes(status as ActiveKitchenStatus);
  }

  private sortTickets(tickets: KitchenTicketListItem[]): KitchenTicketListItem[] {
    return [...tickets].sort(
      (left, right) => Date.parse(left.sentAt) - Date.parse(right.sentAt) || left.id.localeCompare(right.id)
    );
  }

  private setUpdating(ticketId: string, updating: boolean): void {
    const ticketIds = new Set(this.updatingTicketIds());
    if (updating) ticketIds.add(ticketId);
    else ticketIds.delete(ticketId);
    this.updatingTicketIds.set(ticketIds);
  }

  private extractErrorCode(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object')
      return fallback;
    const code = (error.error as { code?: unknown }).code;
    return typeof code === 'string' ? code : fallback;
  }
}
