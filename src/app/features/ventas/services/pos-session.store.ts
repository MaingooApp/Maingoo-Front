import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  BootstrapChange,
  CashSession,
  CashSessionWithMovements,
  DiningArea,
  DiningTable,
  KitchenStation,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  OperationalKitchenTicket,
  OperationalPosOrder,
  OperationalStockSyncJob,
  PosBootstrapResponse,
  PosDevice,
  PosOperationalChange,
  PosSettings,
  SyncState
} from '../models/pos.models';
import { PosService } from './pos.service';

const OPERATIONAL_SYNC_PAGE_SIZE = 200;

@Injectable()
export class PosSessionStore {
  private readonly posService = inject(PosService);
  private loadVersion = 0;

  readonly loading = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly syncState = signal<SyncState>('OFFLINE');
  readonly syncCursor = signal<string | null>(null);

  readonly settings = signal<PosSettings | null>(null);
  readonly device = signal<PosDevice | null>(null);
  readonly areas = signal<DiningArea[]>([]);
  readonly tables = signal<DiningTable[]>([]);
  readonly kitchenStations = signal<KitchenStation[]>([]);
  readonly menuCategories = signal<MenuCategory[]>([]);
  readonly modifierGroups = signal<ModifierGroup[]>([]);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly cashSession = signal<CashSessionWithMovements | null>(null);
  readonly orders = signal<OperationalPosOrder[]>([]);
  readonly kitchenTickets = signal<OperationalKitchenTicket[]>([]);
  readonly stockSyncJobs = signal<OperationalStockSyncJob[]>([]);
  readonly selectedOrderId = signal<string | null>(null);

  readonly activeOrders = computed(() =>
    this.orders().filter((order) => order.status !== 'PAID' && order.status !== 'CANCELLED')
  );
  readonly selectedOrder = computed(() => this.orders().find((order) => order.id === this.selectedOrderId()) ?? null);
  readonly selectedOrderBalance = computed(() => {
    const order = this.selectedOrder();
    return order ? subtractDecimals(order.totalGross, order.paidGross) : '0';
  });

  async load(deviceId: string): Promise<void> {
    const version = ++this.loadVersion;
    this.clearState();
    this.loading.set(true);
    this.syncState.set('SYNCING');

    try {
      const bootstrap = await firstValueFrom(this.posService.getBootstrap(deviceId));
      if (version !== this.loadVersion) return;

      this.applyBootstrap(bootstrap);
      await this.drainOperationalSync(deviceId, version);
      if (version === this.loadVersion) this.syncState.set('ONLINE');
    } catch (error: unknown) {
      if (version === this.loadVersion) {
        this.errorCode.set(this.extractErrorCode(error));
        this.syncState.set('ERROR');
      }
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }

  selectOrder(orderId: string | null): void {
    this.selectedOrderId.set(orderId);
  }

  reset(): void {
    this.loadVersion++;
    this.clearState();
  }

  private clearState(): void {
    this.loading.set(false);
    this.errorCode.set(null);
    this.syncState.set('OFFLINE');
    this.syncCursor.set(null);
    this.settings.set(null);
    this.device.set(null);
    this.areas.set([]);
    this.tables.set([]);
    this.kitchenStations.set([]);
    this.menuCategories.set([]);
    this.modifierGroups.set([]);
    this.menuItems.set([]);
    this.cashSession.set(null);
    this.orders.set([]);
    this.kitchenTickets.set([]);
    this.stockSyncJobs.set([]);
    this.selectedOrderId.set(null);
  }

  private applyBootstrap(bootstrap: PosBootstrapResponse): void {
    this.settings.set(bootstrap.settings);
    this.device.set(bootstrap.device);
    this.areas.set(bootstrap.areas);
    this.tables.set(bootstrap.tables);
    this.kitchenStations.set(bootstrap.kitchenStations);
    this.menuCategories.set(bootstrap.menuCategories);
    this.modifierGroups.set(bootstrap.modifierGroups);
    this.menuItems.set(bootstrap.menuItems);
    this.cashSession.set(bootstrap.cashSession);
    bootstrap.changes.forEach((change) => this.applyBootstrapChange(change));
  }

  private applyBootstrapChange(change: BootstrapChange): void {
    switch (change.resourceType) {
      case 'POS_SETTINGS':
        this.settings.set(change.data);
        break;
      case 'POS_DEVICE':
        this.device.set(change.data);
        break;
      case 'DINING_AREA':
        this.areas.update((items) => upsert(items, change.data));
        break;
      case 'DINING_TABLE':
        this.tables.update((items) => upsert(items, change.data));
        break;
      case 'KITCHEN_STATION':
        this.kitchenStations.update((items) => upsert(items, change.data));
        break;
      case 'MENU_CATEGORY':
        this.menuCategories.update((items) => upsert(items, change.data));
        break;
      case 'MODIFIER_GROUP':
        this.modifierGroups.update((items) => upsert(items, change.data));
        break;
      case 'MENU_ITEM':
        this.menuItems.update((items) => upsert(items, change.data));
        break;
      case 'CASH_SESSION':
        this.cashSession.set(change.data);
        break;
    }
  }

  private async drainOperationalSync(deviceId: string, version: number): Promise<void> {
    let cursor: string | undefined;

    while (version === this.loadVersion) {
      const page = await firstValueFrom(this.posService.getSync(deviceId, cursor));
      if (version !== this.loadVersion) return;

      this.applyOperationalChanges(page.changes);
      this.syncCursor.set(page.serverCursor);

      if (page.changes.length < OPERATIONAL_SYNC_PAGE_SIZE) return;
      if (page.serverCursor === cursor) throw new Error('POS_SYNC_CURSOR_STALLED');
      cursor = page.serverCursor;
    }
  }

  private applyOperationalChanges(changes: PosOperationalChange[]): void {
    for (const change of changes) {
      if (change.resourceType === 'CASH_SESSION') this.applyCashSession(change.data);
    }

    for (const change of changes) {
      switch (change.resourceType) {
        case 'POS_ORDER':
          this.orders.update((items) => upsert(items, change.data));
          break;
        case 'KITCHEN_TICKET':
          this.kitchenTickets.update((items) => upsert(items, change.data));
          break;
        case 'CASH_SESSION':
          break;
        case 'CASH_MOVEMENT':
          this.cashSession.update((session) =>
            session?.id === change.data.cashSessionId
              ? { ...session, cashMovements: upsert(session.cashMovements, change.data) }
              : session
          );
          break;
        case 'STOCK_SYNC_JOB':
          this.stockSyncJobs.update((items) => upsert(items, change.data));
          break;
      }
    }
  }

  private applyCashSession(session: CashSession): void {
    const current = this.cashSession();
    this.cashSession.set({
      ...session,
      cashMovements: current?.id === session.id ? current.cashMovements : []
    });
  }

  private extractErrorCode(error: unknown): string {
    if (error instanceof Error && error.message === 'POS_SYNC_CURSOR_STALLED') return error.message;
    if (!(error instanceof HttpErrorResponse)) return 'POS_LOAD_FAILED';

    const body: unknown = error.error;
    return typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string'
      ? body.code
      : 'POS_LOAD_FAILED';
  }
}

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some(({ id }) => id === item.id)
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];
}

function subtractDecimals(left: string, right: string): string {
  const leftDecimal = parseDecimal(left);
  const rightDecimal = parseDecimal(right);
  const scale = Math.max(leftDecimal.scale, rightDecimal.scale);
  const amount =
    leftDecimal.amount * 10n ** BigInt(scale - leftDecimal.scale) -
    rightDecimal.amount * 10n ** BigInt(scale - rightDecimal.scale);
  const sign = amount < 0n ? '-' : '';
  const digits = (amount < 0n ? -amount : amount).toString().padStart(scale + 1, '0');

  return scale === 0 ? `${sign}${digits}` : `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

function parseDecimal(value: string): { amount: bigint; scale: number } {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error('INVALID_DECIMAL');

  const fraction = match[3] ?? '';
  return {
    amount: BigInt(`${match[1]}${match[2]}${fraction}`),
    scale: fraction.length
  };
}
