import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FiscalCustomer, UpdateLineCommandData, VersionedDeviceCommandData } from '../models/pos-command.models';
import {
  BootstrapChange,
  CashSession,
  CashSessionWithMovements,
  DecimalString,
  DiningArea,
  DiningTable,
  KitchenStation,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  OperationalKitchenTicket,
  OperationalPosOrder,
  OperationalStockSyncJob,
  PaymentMethod,
  PosBootstrapResponse,
  PosDevice,
  PosOperationalChange,
  PosOrder,
  PosOrderChannel,
  PosSettings,
  SyncState
} from '../models/pos.models';
import { PosService } from './pos.service';

const OPERATIONAL_SYNC_PAGE_SIZE = 200;
type StoredPosOrder = OperationalPosOrder | PosOrder;
type ConflictOrderSummary = Pick<PosOrder, 'id' | 'orderNumber' | 'version'>;

interface OperationIntent<T> {
  idempotencyKey: string;
  payload: T;
}

interface OperationOptions {
  intentId?: string;
  conflictOrder?: ConflictOrderSummary;
}

interface PendingPaymentRefresh {
  orderId: string;
  deviceId: string;
  refreshCashSession: boolean;
  intentId: string;
}

@Injectable()
export class PosSessionStore {
  private readonly posService = inject(PosService);
  private loadVersion = 0;
  private readonly operationIntents = new Map<string, OperationIntent<unknown>>();
  private ambiguousIntentId: string | null = null;
  private paymentPendingRefresh: PendingPaymentRefresh | null = null;

  readonly loading = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly operationPending = signal(false);
  readonly operationErrorCode = signal<string | null>(null);
  readonly conflictOrder = signal<ConflictOrderSummary | null>(null);
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
  readonly orders = signal<StoredPosOrder[]>([]);
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

  async createOrder(channel: PosOrderChannel, tableId?: string, guestCount?: number): Promise<void> {
    const device = this.requireDevice();
    if (!device) return;

    const intentId = operationIdentity('CREATE_ORDER', device.id, channel, tableId, guestCount);
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => ({
      deviceId: device.id,
      clientCreatedAt: new Date().toISOString(),
      channel,
      ...(tableId ? { tableId } : {}),
      ...(guestCount === undefined ? {} : { guestCount })
    }));
    await this.runOperation(
      async () => {
        const order = await firstValueFrom(this.posService.createOrder(intent.payload, intent.idempotencyKey));
        this.upsertOrder(order);
        this.selectedOrderId.set(order.id);
      },
      { intentId }
    );
  }

  async addItem(
    menuItemId: string,
    modifierOptionIds?: string[],
    quantity: DecimalString = '1',
    note?: string
  ): Promise<void> {
    const context = this.requireOrderContext();
    if (!context) return;

    const intentId = operationIdentity(
      'ADD_LINE',
      context.order.id,
      context.order.version,
      menuItemId,
      modifierOptionIds,
      quantity,
      note
    );
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => ({
      ...this.versionedCommand(context.device.id, context.order.version),
      menuItemId,
      quantity,
      ...(modifierOptionIds?.length ? { modifierOptionIds } : {}),
      ...(note === undefined ? {} : { note })
    }));
    await this.runOperation(
      async () => {
        const order = await firstValueFrom(
          this.posService.addLine(context.order.id, intent.payload, intent.idempotencyKey)
        );
        this.upsertOrder(order);
      },
      { intentId, conflictOrder: orderSummary(context.order) }
    );
  }

  async updateLine(
    lineId: string,
    changes: Pick<UpdateLineCommandData, 'quantity' | 'discountGross' | 'note'>
  ): Promise<void> {
    const context = this.requireOrderContext();
    if (!context) return;

    const intentId = operationIdentity(
      'UPDATE_LINE',
      context.order.id,
      context.order.version,
      lineId,
      changes.quantity,
      changes.discountGross,
      changes.note
    );
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => ({
      ...this.versionedCommand(context.device.id, context.order.version),
      ...changes
    }));
    await this.runOperation(
      async () => {
        const order = await firstValueFrom(
          this.posService.updateLine(context.order.id, lineId, intent.payload, intent.idempotencyKey)
        );
        this.upsertOrder(order);
      },
      { intentId, conflictOrder: orderSummary(context.order) }
    );
  }

  async removeOpenLine(lineId: string): Promise<void> {
    const context = this.requireOrderContext();
    if (!context) return;

    const intentId = operationIdentity('REMOVE_LINE', context.order.id, context.order.version, lineId);
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => this.versionedCommand(context.device.id, context.order.version));
    await this.runOperation(
      async () => {
        const order = await firstValueFrom(
          this.posService.removeLine(context.order.id, lineId, intent.payload, intent.idempotencyKey)
        );
        this.upsertOrder(order);
      },
      { intentId, conflictOrder: orderSummary(context.order) }
    );
  }

  async sendSelectedOrder(): Promise<void> {
    const context = this.requireOrderContext();
    if (!context) return;

    const intentId = operationIdentity('SEND_ORDER', context.order.id, context.order.version);
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => this.versionedCommand(context.device.id, context.order.version));
    await this.runOperation(
      async () => {
        const order = await firstValueFrom(
          this.posService.sendOrder(context.order.id, intent.payload, intent.idempotencyKey)
        );
        this.upsertOrder(order);
      },
      { intentId, conflictOrder: orderSummary(context.order) }
    );
  }

  async voidSelectedOrderLine(lineId: string, reason: string): Promise<void> {
    const context = this.requireOrderContext();
    if (!context) return;

    const intentId = operationIdentity('VOID_LINE', context.order.id, context.order.version, lineId, reason);
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => ({
      ...this.versionedCommand(context.device.id, context.order.version),
      lineId,
      reason
    }));
    await this.runOperation(
      async () => {
        const order = await firstValueFrom(
          this.posService.voidLine(context.order.id, intent.payload, intent.idempotencyKey)
        );
        this.upsertOrder(order);
      },
      { intentId, conflictOrder: orderSummary(context.order) }
    );
  }

  async openCashSession(openingAmount: DecimalString): Promise<void> {
    const device = this.requireDevice();
    if (!device) return;
    if (this.cashSession()?.status === 'OPEN') {
      this.operationErrorCode.set('CASH_SESSION_ALREADY_OPEN');
      return;
    }

    const intentId = operationIdentity('OPEN_CASH_SESSION', device.id, openingAmount);
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => ({
      deviceId: device.id,
      clientCreatedAt: new Date().toISOString(),
      openingAmount
    }));
    await this.runOperation(
      async () => {
        this.cashSession.set(
          await firstValueFrom(this.posService.openCashSession(intent.payload, intent.idempotencyKey))
        );
      },
      { intentId }
    );
  }

  async addPayment(method: PaymentMethod, amount: DecimalString, externalReference?: string): Promise<void> {
    if (this.paymentPendingRefresh) {
      const pending = this.paymentPendingRefresh;
      await this.runOperation(() => this.refreshPaymentState(pending), { intentId: pending.intentId });
      return;
    }

    const context = this.requireOrderContext(true);
    if (!context) return;

    const intentId = operationIdentity(
      'ADD_PAYMENT',
      context.order.id,
      context.order.version,
      method,
      amount,
      externalReference
    );
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => ({
      ...this.versionedCommand(context.device.id, context.order.version),
      cashSessionId: context.cashSession.id,
      method,
      amount,
      ...(externalReference === undefined ? {} : { externalReference })
    }));
    await this.runOperation(
      async () => {
        await firstValueFrom(this.posService.addPayment(context.order.id, intent.payload, intent.idempotencyKey));
        const pending: PendingPaymentRefresh = {
          orderId: context.order.id,
          deviceId: context.device.id,
          refreshCashSession: method === 'CASH',
          intentId
        };
        this.paymentPendingRefresh = pending;
        await this.refreshPaymentState(pending);
      },
      { intentId, conflictOrder: orderSummary(context.order) }
    );
  }

  async finalizeSelectedOrder(fiscalCustomer?: FiscalCustomer): Promise<void> {
    const context = this.requireOrderContext(true);
    if (!context) return;

    const intentId = operationIdentity(
      'FINALIZE_ORDER',
      context.order.id,
      context.order.version,
      fiscalCustomer?.legalName,
      fiscalCustomer?.taxId,
      fiscalCustomer?.fiscalAddress
    );
    if (!this.canRunIntent(intentId)) return;
    const intent = this.intent(intentId, () => ({
      ...this.versionedCommand(context.device.id, context.order.version),
      ...(fiscalCustomer ? { fiscalCustomer } : {})
    }));
    await this.runOperation(
      async () => {
        const order = await firstValueFrom(
          this.posService.finalizeOrder(context.order.id, intent.payload, intent.idempotencyKey)
        );
        this.upsertOrder(order);
      },
      { intentId, conflictOrder: orderSummary(context.order) }
    );
    if (!this.operationErrorCode()) await this.syncNow();
  }

  async syncNow(): Promise<void> {
    const device = this.device();
    if (!device || this.operationPending()) return;

    const version = this.loadVersion;
    this.operationPending.set(true);
    this.syncState.set('SYNCING');
    try {
      await this.drainOperationalSync(device.id, version, this.syncCursor() ?? undefined);
      if (version === this.loadVersion && !this.conflictOrder()) this.syncState.set('ONLINE');
    } catch {
      if (version === this.loadVersion) this.syncState.set('ERROR');
    } finally {
      if (version === this.loadVersion) this.operationPending.set(false);
    }
  }

  async useServerConflict(): Promise<void> {
    const conflict = this.conflictOrder();
    if (!conflict) return;

    await this.runOperation(async () => {
      const order = await firstValueFrom(this.posService.getOrder(conflict.id));
      this.upsertOrder(order);
      this.selectedOrderId.set(order.id);
      this.conflictOrder.set(null);
      this.operationErrorCode.set(null);
      if (this.syncState() === 'CONFLICT') this.syncState.set('ONLINE');
    });
  }

  reset(): void {
    this.loadVersion++;
    this.clearState();
  }

  private clearState(): void {
    this.loading.set(false);
    this.errorCode.set(null);
    this.operationPending.set(false);
    this.operationErrorCode.set(null);
    this.conflictOrder.set(null);
    this.operationIntents.clear();
    this.ambiguousIntentId = null;
    this.paymentPendingRefresh = null;
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

  private async drainOperationalSync(deviceId: string, version: number, initialCursor?: string): Promise<void> {
    let cursor = initialCursor;

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
          this.upsertOrder(change.data);
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

  private async runOperation(operation: () => Promise<void>, options: OperationOptions = {}): Promise<void> {
    if (this.operationPending()) return;

    this.operationPending.set(true);
    this.operationErrorCode.set(null);
    try {
      await operation();
      if (options.intentId) {
        this.operationIntents.delete(options.intentId);
        if (this.ambiguousIntentId === options.intentId) this.ambiguousIntentId = null;
      }
    } catch (error: unknown) {
      if (options.intentId) {
        if (isClientError(error)) {
          this.operationIntents.delete(options.intentId);
          if (this.ambiguousIntentId === options.intentId) this.ambiguousIntentId = null;
        } else {
          this.ambiguousIntentId = options.intentId;
        }
      }
      const conflict = isVersionConflict(error);
      if (conflict && options.conflictOrder) {
        this.conflictOrder.set(conflictSummary(error, options.conflictOrder));
        this.syncState.set('CONFLICT');
      }
      this.operationErrorCode.set(conflict ? 'ORDER_VERSION_CONFLICT' : this.extractOperationErrorCode(error));
    } finally {
      this.operationPending.set(false);
    }
  }

  private async refreshPaymentState(pending: PendingPaymentRefresh): Promise<void> {
    this.upsertOrder(await firstValueFrom(this.posService.getOrder(pending.orderId)));
    this.paymentPendingRefresh = null;
    if (pending.refreshCashSession) {
      // ponytail: cash detail is ancillary here; F3 refreshes it authoritatively for users with pos.cash.
      const session = await firstValueFrom(this.posService.getCurrentCashSession(pending.deviceId)).catch(
        () => undefined
      );
      if (session !== undefined) this.cashSession.set(session);
    }
  }

  private requireDevice(): PosDevice | null {
    if (this.paymentPendingRefresh) {
      this.operationErrorCode.set('POS_ORDER_REFRESH_REQUIRED');
      return null;
    }
    const device = this.device();
    if (!device) this.operationErrorCode.set('POS_DEVICE_REQUIRED');
    return device;
  }

  private requireOrderContext(
    requireCashSession: true
  ): { device: PosDevice; order: StoredPosOrder; cashSession: CashSessionWithMovements } | null;
  private requireOrderContext(
    requireCashSession?: false
  ): { device: PosDevice; order: StoredPosOrder; cashSession: CashSessionWithMovements | null } | null;
  private requireOrderContext(
    requireCashSession = false
  ): { device: PosDevice; order: StoredPosOrder; cashSession: CashSessionWithMovements | null } | null {
    const device = this.requireDevice();
    if (!device) return null;

    const order = this.selectedOrder();
    if (!order) {
      this.operationErrorCode.set('POS_ORDER_REQUIRED');
      return null;
    }
    if (this.conflictOrder()?.id === order.id) {
      this.operationErrorCode.set('ORDER_VERSION_CONFLICT');
      return null;
    }

    const cashSession = this.cashSession();
    if (requireCashSession && cashSession?.status !== 'OPEN') {
      this.operationErrorCode.set('CASH_SESSION_REQUIRED');
      return null;
    }
    return { device, order, cashSession };
  }

  private versionedCommand(deviceId: string, expectedVersion: number): VersionedDeviceCommandData {
    return {
      deviceId,
      clientCreatedAt: new Date().toISOString(),
      expectedVersion
    };
  }

  private upsertOrder(order: StoredPosOrder): void {
    this.orders.update((items) => {
      const current = items.find(({ id }) => id === order.id);
      return current && current.version > order.version ? items : upsert<StoredPosOrder>(items, order);
    });
  }

  private intent<T>(id: string, createPayload: () => T): OperationIntent<T> {
    const existing = this.operationIntents.get(id);
    if (existing) return existing as OperationIntent<T>;

    const intent = { idempotencyKey: crypto.randomUUID(), payload: createPayload() };
    this.operationIntents.set(id, intent);
    return intent;
  }

  private canRunIntent(id: string): boolean {
    if (!this.ambiguousIntentId || this.ambiguousIntentId === id) return true;

    this.operationErrorCode.set('POS_OPERATION_RECONCILIATION_REQUIRED');
    return false;
  }

  private extractOperationErrorCode(error: unknown): string {
    if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
      return 'POS_OPERATION_FAILED';
    }
    const code = (error.error as Record<string, unknown>)['code'];
    return typeof code === 'string' ? code : 'POS_OPERATION_FAILED';
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

function operationIdentity(type: string, ...parts: unknown[]): string {
  return JSON.stringify([type, ...parts]);
}

function orderSummary(order: StoredPosOrder): ConflictOrderSummary {
  return { id: order.id, orderNumber: order.orderNumber, version: order.version };
}

function isClientError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500;
}

function isVersionConflict(error: unknown): error is HttpErrorResponse {
  return (
    error instanceof HttpErrorResponse &&
    error.error !== null &&
    typeof error.error === 'object' &&
    (error.error as Record<string, unknown>)['code'] === 'ORDER_VERSION_CONFLICT'
  );
}

function conflictSummary(error: HttpErrorResponse, fallback: ConflictOrderSummary): ConflictOrderSummary {
  const currentOrder = (error.error as Record<string, unknown>)['currentOrder'];
  if (typeof currentOrder !== 'object' || currentOrder === null) return fallback;

  const value = currentOrder as Record<string, unknown>;
  return typeof value['id'] === 'string' &&
    typeof value['orderNumber'] === 'number' &&
    typeof value['version'] === 'number'
    ? { id: value['id'], orderNumber: value['orderNumber'], version: value['version'] }
    : fallback;
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
