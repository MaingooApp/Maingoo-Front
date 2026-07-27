import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  FiscalCustomer,
  QueuedPosCommand,
  UpdateLineCommandData,
  VersionedDeviceCommandData
} from '../models/pos-command.models';
import {
  createLocalOrderIdentity,
  LocalPosOrder,
  PosOrderViewModel,
  projectPosOrder
} from '../models/pos-local.models';
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
import {
  OfflineOrderSnapshot,
  OfflineStoredOrder,
  PosOfflineQueueService,
  PosOfflineStorageError
} from './pos-offline-queue.service';
import { PosService } from './pos.service';
import { PosSyncCallbacks, PosSyncService } from './pos-sync.service';

type AuthoritativeOrder = OperationalPosOrder | PosOrder;
type ConflictOrderSummary = Pick<PosOrder, 'id' | 'orderNumber' | 'version'>;

@Injectable()
export class PosSessionStore implements OnDestroy {
  private readonly posService = inject(PosService);
  private readonly queue = inject(PosOfflineQueueService);
  private readonly sync = inject(PosSyncService);
  private readonly authoritativeOrders = signal<AuthoritativeOrder[]>([]);
  private readonly localOrders = signal<LocalPosOrder[]>([]);
  private readonly commands = signal<QueuedPosCommand[]>([]);
  private enterpriseId: string | null = null;
  private loadVersion = 0;
  private readonly directIntents = new Map<string, string>();
  private ambiguousDirectIntentId: string | null = null;

  readonly loading = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly operationPending = signal(false);
  readonly operationErrorCode = signal<string | null>(null);
  readonly storageErrorCode = signal<string | null>(null);
  readonly syncErrorCode = signal<string | null>(null);
  readonly conflictOrder = signal<ConflictOrderSummary | null>(null);
  readonly syncState = signal<SyncState>('OFFLINE');
  readonly syncCursor = signal<string | null>(null);
  readonly cachedAt = signal<string | null>(null);
  readonly lastSyncAt = signal<string | null>(null);
  readonly pendingCommandCount = computed(() => this.commands().length);
  readonly conflicts = computed(() => this.commands().filter(({ status }) => status === 'CONFLICT'));

  readonly settings = signal<PosSettings | null>(null);
  readonly device = signal<PosDevice | null>(null);
  readonly areas = signal<DiningArea[]>([]);
  readonly tables = signal<DiningTable[]>([]);
  readonly kitchenStations = signal<KitchenStation[]>([]);
  readonly menuCategories = signal<MenuCategory[]>([]);
  readonly modifierGroups = signal<ModifierGroup[]>([]);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly cashSession = signal<CashSessionWithMovements | null>(null);
  readonly kitchenTickets = signal<OperationalKitchenTicket[]>([]);
  readonly stockSyncJobs = signal<OperationalStockSyncJob[]>([]);
  readonly selectedOrderId = signal<string | null>(null);

  readonly orders = computed(() => {
    const authoritative = this.authoritativeOrders();
    const local = this.localOrders();
    const commands = this.commands();
    const ids = new Set([
      ...authoritative.map(({ id }) => id),
      ...local.map(({ id }) => id),
      ...commands.filter(({ type }) => type !== 'UPDATE_KITCHEN_TICKET').map(({ aggregateId }) => aggregateId)
    ]);
    return [...ids].flatMap((aggregateId) => {
      const serverOrder = authoritative.find(({ id }) => id === aggregateId);
      const localOrder = local.find(({ id }) => id === aggregateId);
      return serverOrder || localOrder
        ? [
            projectPosOrder({
              aggregateId,
              authoritativeOrder: serverOrder,
              localOrder,
              commands,
              menuItems: this.menuItems()
            })
          ]
        : [];
    });
  });
  readonly activeOrders = computed(() =>
    this.orders().filter(({ serverStatus }) => serverStatus !== 'PAID' && serverStatus !== 'CANCELLED')
  );
  readonly selectedOrder = computed(() => this.orders().find(({ id }) => id === this.selectedOrderId()) ?? null);
  readonly selectedAuthoritativeOrder = computed(() => this.authoritativeOrder(this.selectedOrderId()));
  readonly selectedOrderBalance = computed(() => {
    const order = this.selectedOrder();
    const total = order?.authoritativeTotalGross ?? order?.estimatedTotalGross;
    return total ? subtractDecimals(total, order?.paidGross ?? '0') : '0';
  });

  private readonly syncCallbacks: PosSyncCallbacks = {
    applyAuthoritativeOrder: async (order) => {
      const selectedBefore = this.selectedOrderId();
      this.upsertAuthoritativeOrder(order);
      await this.refreshOfflineState();
      if (selectedBefore && !this.orders().some(({ id }) => id === selectedBefore)) this.selectedOrderId.set(order.id);
    },
    applyOperationalChanges: async (changes) => {
      await this.applyOperationalChanges(changes);
    },
    commandChanged: async () => {
      await this.refreshOfflineState();
    },
    conflict: async (_command, order, code) => {
      this.upsertAuthoritativeOrder(order);
      this.conflictOrder.set(orderSummary(order));
      this.operationErrorCode.set(code);
      this.syncState.set('CONFLICT');
      await this.refreshOfflineState();
    },
    error: (code) => {
      this.syncErrorCode.set(code);
      if (code === 'DEVICE_REVOKED' || code === 'POS_DISABLED') this.errorCode.set(code);
      this.syncState.set('ERROR');
    },
    syncing: async (active) => {
      if (active) {
        this.syncErrorCode.set(null);
        this.syncState.set('SYNCING');
        return;
      }
      await this.refreshOfflineState();
      const cachedDevice = await this.queue.getDevice();
      this.syncCursor.set(cachedDevice?.syncCursor ?? null);
      this.lastSyncAt.set(cachedDevice?.lastSyncAt ?? null);
      if (!this.conflictOrder() && this.syncState() !== 'ERROR') {
        this.syncState.set(this.online() ? 'ONLINE' : 'OFFLINE');
      }
    }
  };

  async initialize(enterpriseId: string): Promise<void> {
    const version = ++this.loadVersion;
    this.sync.stop();
    this.clearMemory();
    this.enterpriseId = enterpriseId;
    this.loading.set(true);
    try {
      await this.queue.useEnterprise(enterpriseId);
      this.sync.start(this.syncCallbacks);
      const [bootstrap, cachedDevice, orders, commands] = await Promise.all([
        this.queue.getCachedBootstrap(),
        this.queue.getDevice(),
        this.queue.getOrders(),
        this.queue.listCommands()
      ]);
      if (version !== this.loadVersion) return;
      if (bootstrap) this.applyCachedBootstrap(bootstrap);
      this.device.set(cachedDevice?.device ?? null);
      this.syncCursor.set(cachedDevice?.syncCursor ?? null);
      this.lastSyncAt.set(cachedDevice?.lastSyncAt ?? null);
      this.setOfflineState(orders, commands);
      this.syncState.set(this.online() ? 'ONLINE' : 'OFFLINE');
    } catch (error: unknown) {
      if (version === this.loadVersion) this.setStorageError(error);
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }

  async activateDevice(deviceId: string): Promise<void> {
    if (!this.enterpriseId) {
      this.errorCode.set('POS_ENTERPRISE_REQUIRED');
      return;
    }
    if (!this.online()) {
      if (this.device()?.id !== deviceId) this.errorCode.set('POS_DEVICE_OFFLINE_UNAVAILABLE');
      this.syncState.set('OFFLINE');
      return;
    }

    const version = ++this.loadVersion;
    this.loading.set(true);
    this.errorCode.set(null);
    this.syncState.set('SYNCING');
    try {
      const cached = await this.queue.getCachedBootstrap();
      let bootstrap: PosBootstrapResponse;
      try {
        bootstrap = await firstValueFrom(this.posService.getBootstrap(deviceId, cached?.cursor, this.enterpriseId));
      } catch (error: unknown) {
        if (errorCode(error) !== 'INVALID_SYNC_CURSOR') throw error;
        bootstrap = await firstValueFrom(this.posService.getBootstrap(deviceId, undefined, this.enterpriseId));
      }
      if (version !== this.loadVersion) return;
      this.applyBootstrap(bootstrap);
      await this.queue.cacheBootstrap(bootstrap);
      this.cachedAt.set((await this.queue.getCachedBootstrap())?.cachedAt ?? null);
      if (!bootstrap.device) {
        this.errorCode.set('POS_DEVICE_REQUIRED');
        this.syncState.set('ERROR');
        return;
      }
      await this.queue.saveDevice(bootstrap.device);
      this.sync.start(this.syncCallbacks);
      await this.sync.requestSync();
      if (version === this.loadVersion && !this.conflictOrder() && this.syncState() !== 'ERROR') {
        this.syncState.set('ONLINE');
      }
    } catch (error: unknown) {
      if (version === this.loadVersion) {
        if (error instanceof PosOfflineStorageError) this.setStorageError(error);
        else {
          this.errorCode.set(errorCode(error) ?? 'POS_LOAD_FAILED');
          this.syncState.set('ERROR');
        }
      }
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }

  selectOrder(orderId: string | null): void {
    this.selectedOrderId.set(orderId);
  }

  authoritativeOrder(orderId: string | null): AuthoritativeOrder | null {
    return orderId ? (this.authoritativeOrders().find(({ id }) => id === orderId) ?? null) : null;
  }

  async invalidateCachedDevice(): Promise<void> {
    this.loadVersion++;
    this.sync.stop();
    this.device.set(null);
    this.selectedOrderId.set(null);
    this.errorCode.set('POS_DEVICE_UNAVAILABLE');
    this.syncState.set(this.online() ? 'ONLINE' : 'OFFLINE');
    try {
      await this.queue.clearDevice();
    } catch (error: unknown) {
      this.setStorageError(error);
    }
  }

  async createOrder(channel: PosOrderChannel, tableId?: string, guestCount?: number): Promise<void> {
    const device = this.requireDevice();
    if (!device) return;
    const identity = createLocalOrderIdentity();
    const clientCreatedAt = new Date().toISOString();
    const data = {
      deviceId: device.id,
      clientCreatedAt,
      channel,
      ...(tableId ? { tableId } : {}),
      ...(guestCount === undefined ? {} : { guestCount })
    };
    const localOrder: LocalPosOrder = {
      kind: 'LOCAL_POS_ORDER',
      id: identity.id,
      temporaryNumber: identity.temporaryNumber,
      enterpriseId: device.enterpriseId,
      deviceId: device.id,
      tableId: tableId ?? null,
      channel,
      guestCount: guestCount ?? null,
      note: null,
      clientCreatedAt
    };
    await this.persistMutation(localOrder, { type: 'CREATE_ORDER', aggregateId: localOrder.id, data }, localOrder.id);
  }

  async addItem(
    menuItemId: string,
    modifierOptionIds?: string[],
    quantity: DecimalString = '1',
    note?: string
  ): Promise<void> {
    const context = this.requireQueuedOrderContext();
    if (!context) return;
    const lineId = `local-line:${crypto.randomUUID()}`;
    await this.persistMutation(
      context.snapshot,
      {
        type: 'ADD_LINE',
        aggregateId: context.view.id,
        targetId: lineId,
        data: {
          ...this.versionedCommand(context.device.id, context.expectedVersion),
          menuItemId,
          quantity,
          ...(modifierOptionIds?.length ? { modifierOptionIds } : {}),
          ...(note === undefined ? {} : { note })
        }
      },
      context.view.id
    );
  }

  async updateLine(
    lineId: string,
    changes: Pick<UpdateLineCommandData, 'quantity' | 'discountGross' | 'note'>
  ): Promise<void> {
    const context = this.requireQueuedOrderContext();
    if (!context) return;
    await this.persistMutation(
      context.snapshot,
      {
        type: 'UPDATE_LINE',
        aggregateId: context.view.id,
        targetId: lineId,
        data: { ...this.versionedCommand(context.device.id, context.expectedVersion), ...changes }
      },
      context.view.id
    );
  }

  async removeOpenLine(lineId: string): Promise<void> {
    const context = this.requireQueuedOrderContext();
    if (!context) return;
    await this.persistMutation(
      context.snapshot,
      {
        type: 'REMOVE_LINE',
        aggregateId: context.view.id,
        targetId: lineId,
        data: this.versionedCommand(context.device.id, context.expectedVersion)
      },
      context.view.id
    );
  }

  async sendSelectedOrder(): Promise<void> {
    const context = this.requireQueuedOrderContext();
    if (!context) return;
    await this.persistMutation(
      context.snapshot,
      {
        type: 'SEND_ORDER',
        aggregateId: context.view.id,
        data: this.versionedCommand(context.device.id, context.expectedVersion)
      },
      context.view.id
    );
  }

  async voidSelectedOrderLine(lineId: string, reason: string): Promise<void> {
    const context = this.requireDirectOrder();
    if (!context) return;
    await this.runDirect('VOID_LINE', [context.order.id, context.order.version, lineId, reason], async (key) => {
      const order = await firstValueFrom(
        this.posService.voidLine(
          context.order.id,
          { ...this.versionedCommand(context.device.id, context.order.version), lineId, reason },
          key
        )
      );
      await this.applyDirectOrder(order);
    });
  }

  async openCashSession(openingAmount: DecimalString): Promise<void> {
    const device = this.requireDevice();
    if (!device || !this.requireOnline()) return;
    if (this.cashSession()?.status === 'OPEN') {
      this.operationErrorCode.set('CASH_SESSION_ALREADY_OPEN');
      return;
    }
    await this.runDirect('OPEN_CASH_SESSION', [device.id, openingAmount], async (key) => {
      this.cashSession.set(
        await firstValueFrom(
          this.posService.openCashSession(
            { deviceId: device.id, clientCreatedAt: new Date().toISOString(), openingAmount },
            key
          )
        )
      );
    });
  }

  async addPayment(method: PaymentMethod, amount: DecimalString, externalReference?: string): Promise<void> {
    const context = this.requireDirectOrder(true);
    if (!context) return;
    await this.runDirect(
      'ADD_PAYMENT',
      [context.order.id, context.order.version, method, amount, externalReference],
      async (key) => {
        await firstValueFrom(
          this.posService.addPayment(
            context.order.id,
            {
              ...this.versionedCommand(context.device.id, context.order.version),
              cashSessionId: context.cashSession.id,
              method,
              amount,
              ...(externalReference === undefined ? {} : { externalReference })
            },
            key
          )
        );
        await this.applyDirectOrder(await firstValueFrom(this.posService.getOrder(context.order.id)));
        if (method === 'CASH') {
          const session = await firstValueFrom(this.posService.getCurrentCashSession(context.device.id)).catch(
            () => undefined
          );
          if (session) this.cashSession.set(session);
        }
      }
    );
  }

  async finalizeSelectedOrder(fiscalCustomer?: FiscalCustomer): Promise<void> {
    const context = this.requireDirectOrder(true);
    if (!context) return;
    await this.runDirect(
      'FINALIZE_ORDER',
      [
        context.order.id,
        context.order.version,
        fiscalCustomer?.legalName,
        fiscalCustomer?.taxId,
        fiscalCustomer?.fiscalAddress
      ],
      async (key) => {
        const order = await firstValueFrom(
          this.posService.finalizeOrder(
            context.order.id,
            {
              ...this.versionedCommand(context.device.id, context.order.version),
              ...(fiscalCustomer ? { fiscalCustomer } : {})
            },
            key
          )
        );
        await this.applyDirectOrder(order);
      }
    );
    if (!this.operationErrorCode()) await this.syncNow();
  }

  async syncNow(): Promise<void> {
    if (!this.requireOnline() || !this.device() || this.operationPending()) return;
    await this.sync.requestSync();
  }

  connectivityChanged(online: boolean): void {
    if (!online) {
      this.syncState.set('OFFLINE');
      return;
    }
    if (!this.device()) {
      this.syncState.set('ONLINE');
      return;
    }
    this.syncState.set('SYNCING');
    void this.sync.requestSync().catch((error: unknown) => this.setStorageError(error));
  }

  async useServerConflict(): Promise<void> {
    const conflict = this.conflictOrder();
    if (!conflict) return;
    const authoritative = this.authoritativeOrder(conflict.id);
    if (!authoritative) {
      this.operationErrorCode.set('POS_AUTHORITATIVE_ORDER_REQUIRED');
      return;
    }
    try {
      await this.queue.discardAggregateCommands(conflict.id, authoritative);
      await this.refreshOfflineState();
      this.operationErrorCode.set(null);
      this.syncState.set(this.conflictOrder() ? 'CONFLICT' : this.online() ? 'ONLINE' : 'OFFLINE');
    } catch (error: unknown) {
      this.setStorageError(error);
    }
  }

  reset(): void {
    this.loadVersion++;
    this.sync.stop();
    this.queue.close();
    this.enterpriseId = null;
    this.clearMemory();
  }

  ngOnDestroy(): void {
    this.reset();
  }

  private async persistMutation(
    snapshot: OfflineStoredOrder,
    input: Parameters<PosOfflineQueueService['enqueueWithOrder']>[1],
    selectId: string
  ): Promise<void> {
    if (this.operationPending()) return;
    this.operationPending.set(true);
    this.operationErrorCode.set(null);
    this.storageErrorCode.set(null);
    this.syncErrorCode.set(null);
    try {
      await this.queue.enqueueWithOrder(snapshot, input);
      await this.refreshOfflineState();
      this.selectedOrderId.set(selectId);
      if (this.online()) void this.sync.requestSync().catch((error: unknown) => this.setStorageError(error));
    } catch (error: unknown) {
      this.setStorageError(error);
    } finally {
      this.operationPending.set(false);
    }
  }

  private async applyDirectOrder(order: PosOrder): Promise<void> {
    this.upsertAuthoritativeOrder(order);
    await this.queue.saveOrder(order);
  }

  private async runDirect(type: string, identity: unknown[], operation: (key: string) => Promise<void>): Promise<void> {
    if (this.operationPending()) return;
    const id = JSON.stringify([type, ...identity]);
    if (this.ambiguousDirectIntentId && this.ambiguousDirectIntentId !== id) {
      this.operationErrorCode.set('POS_OPERATION_RECONCILIATION_REQUIRED');
      return;
    }
    const key = this.directIntents.get(id) ?? crypto.randomUUID();
    this.directIntents.set(id, key);
    this.operationPending.set(true);
    this.operationErrorCode.set(null);
    try {
      await operation(key);
      this.directIntents.delete(id);
      if (this.ambiguousDirectIntentId === id) this.ambiguousDirectIntentId = null;
    } catch (error: unknown) {
      if (error instanceof PosOfflineStorageError) {
        this.setStorageError(error);
        return;
      }
      if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
        this.directIntents.delete(id);
        if (this.ambiguousDirectIntentId === id) this.ambiguousDirectIntentId = null;
      } else {
        this.ambiguousDirectIntentId = id;
      }
      if (errorCode(error) === 'ORDER_VERSION_CONFLICT') {
        const order = await firstValueFrom(this.posService.getOrder(identity[0] as string)).catch(() => null);
        if (order) {
          this.upsertAuthoritativeOrder(order);
          this.conflictOrder.set(orderSummary(order));
          this.syncState.set('CONFLICT');
        }
      }
      this.operationErrorCode.set(errorCode(error) ?? 'POS_OPERATION_FAILED');
    } finally {
      this.operationPending.set(false);
    }
  }

  private requireQueuedOrderContext(): {
    device: PosDevice;
    view: PosOrderViewModel;
    snapshot: OfflineStoredOrder;
    expectedVersion: number;
  } | null {
    const device = this.requireDevice();
    const view = this.selectedOrder();
    if (!device || !view) {
      if (!view) this.operationErrorCode.set('POS_ORDER_REQUIRED');
      return null;
    }
    if (this.conflictOrder()?.id === view.id || view.syncStatus === 'CONFLICT' || view.syncStatus === 'FAILED') {
      this.operationErrorCode.set('ORDER_VERSION_CONFLICT');
      return null;
    }
    const snapshot = this.authoritativeOrder(view.id) ?? this.localOrders().find(({ id }) => id === view.id);
    if (!snapshot) {
      this.operationErrorCode.set('POS_ORDER_REQUIRED');
      return null;
    }
    const versionedPending = this.commands().filter(
      (command) =>
        command.aggregateId === view.id &&
        ['ADD_LINE', 'UPDATE_LINE', 'REMOVE_LINE', 'SEND_ORDER'].includes(command.type)
    ).length;
    return {
      device,
      view,
      snapshot,
      expectedVersion: (view.serverVersion ?? 1) + versionedPending
    };
  }

  private requireDirectOrder(requireCashSession: true): {
    device: PosDevice;
    order: AuthoritativeOrder;
    cashSession: CashSessionWithMovements;
  } | null;
  private requireDirectOrder(requireCashSession?: false): {
    device: PosDevice;
    order: AuthoritativeOrder;
    cashSession: CashSessionWithMovements | null;
  } | null;
  private requireDirectOrder(requireCashSession = false): {
    device: PosDevice;
    order: AuthoritativeOrder;
    cashSession: CashSessionWithMovements | null;
  } | null {
    const device = this.requireDevice();
    const view = this.selectedOrder();
    if (!device || !view || !this.requireOnline()) {
      if (!view) this.operationErrorCode.set('POS_ORDER_REQUIRED');
      return null;
    }
    if (view.source !== 'SERVER') {
      this.operationErrorCode.set('POS_AUTHORITATIVE_ORDER_REQUIRED');
      return null;
    }
    if (view.pendingCommandCount > 0) {
      this.operationErrorCode.set('POS_ORDER_SYNC_PENDING');
      return null;
    }
    const order = this.authoritativeOrder(view.id);
    if (!order) {
      this.operationErrorCode.set('POS_AUTHORITATIVE_ORDER_REQUIRED');
      return null;
    }
    const cashSession = this.cashSession();
    if (requireCashSession && cashSession?.status !== 'OPEN') {
      this.operationErrorCode.set('CASH_SESSION_REQUIRED');
      return null;
    }
    return { device, order, cashSession } as ReturnType<PosSessionStore['requireDirectOrder']>;
  }

  private requireDevice(): PosDevice | null {
    const device = this.device();
    if (!device) this.operationErrorCode.set('POS_DEVICE_REQUIRED');
    return device;
  }

  private requireOnline(): boolean {
    if (this.online()) return true;
    this.operationErrorCode.set('POS_ONLINE_REQUIRED');
    this.syncState.set('OFFLINE');
    return false;
  }

  private online(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  private versionedCommand(deviceId: string, expectedVersion: number): VersionedDeviceCommandData {
    return { deviceId, clientCreatedAt: new Date().toISOString(), expectedVersion };
  }

  private async refreshOfflineState(): Promise<void> {
    const [orders, commands] = await Promise.all([this.queue.getOrders(), this.queue.listCommands()]);
    this.setOfflineState(orders, commands);
  }

  private setOfflineState(orders: OfflineStoredOrder[], commands: QueuedPosCommand[]): void {
    this.authoritativeOrders.set(orders.filter(isAuthoritativeOrder));
    this.localOrders.set(orders.filter(isLocalOrder));
    this.commands.set(commands);
    const conflict = commands.find(({ status }) => status === 'CONFLICT');
    const authoritative = conflict ? this.authoritativeOrder(conflict.aggregateId) : null;
    this.conflictOrder.set(authoritative ? orderSummary(authoritative) : null);
  }

  private applyCachedBootstrap(bootstrap: Awaited<ReturnType<PosOfflineQueueService['getCachedBootstrap']>>): void {
    if (!bootstrap) return;
    this.settings.set(bootstrap.settings);
    this.areas.set(bootstrap.areas);
    this.tables.set(bootstrap.tables);
    this.kitchenStations.set(bootstrap.kitchenStations);
    this.menuCategories.set(bootstrap.menuCategories);
    this.modifierGroups.set(bootstrap.modifierGroups);
    this.menuItems.set(bootstrap.menuItems);
    this.cachedAt.set(bootstrap.cachedAt);
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

  private async applyOperationalChanges(changes: readonly PosOperationalChange[]): Promise<void> {
    for (const change of changes) {
      if (change.resourceType === 'POS_ORDER') await this.queue.saveOrder(change.data);
      if (change.resourceType === 'CASH_SESSION') this.applyCashSession(change.data);
    }
    for (const change of changes) {
      switch (change.resourceType) {
        case 'POS_ORDER':
          this.upsertAuthoritativeOrder(change.data);
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

  private upsertAuthoritativeOrder(order: AuthoritativeOrder): void {
    this.authoritativeOrders.update((items) => {
      const current = items.find(({ id }) => id === order.id);
      return current && current.version > order.version ? items : upsert(items, order);
    });
  }

  private setStorageError(error: unknown): void {
    const code = error instanceof PosOfflineStorageError ? error.code : 'POS_OFFLINE_STORAGE_FAILED';
    this.storageErrorCode.set(code);
    this.operationErrorCode.set(code);
    this.errorCode.set(code);
    this.syncState.set('ERROR');
  }

  private clearMemory(): void {
    this.loading.set(false);
    this.errorCode.set(null);
    this.operationPending.set(false);
    this.operationErrorCode.set(null);
    this.storageErrorCode.set(null);
    this.syncErrorCode.set(null);
    this.conflictOrder.set(null);
    this.directIntents.clear();
    this.ambiguousDirectIntentId = null;
    this.syncState.set('OFFLINE');
    this.syncCursor.set(null);
    this.cachedAt.set(null);
    this.lastSyncAt.set(null);
    this.settings.set(null);
    this.device.set(null);
    this.areas.set([]);
    this.tables.set([]);
    this.kitchenStations.set([]);
    this.menuCategories.set([]);
    this.modifierGroups.set([]);
    this.menuItems.set([]);
    this.cashSession.set(null);
    this.authoritativeOrders.set([]);
    this.localOrders.set([]);
    this.commands.set([]);
    this.kitchenTickets.set([]);
    this.stockSyncJobs.set([]);
    this.selectedOrderId.set(null);
  }
}

function isLocalOrder(order: OfflineStoredOrder): order is LocalPosOrder {
  return 'kind' in order;
}

function isAuthoritativeOrder(order: OfflineStoredOrder): order is OfflineOrderSnapshot {
  return !isLocalOrder(order);
}

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some(({ id }) => id === item.id)
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];
}

function orderSummary(order: AuthoritativeOrder): ConflictOrderSummary {
  return { id: order.id, orderNumber: order.orderNumber, version: order.version };
}

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') return;
  const code = (error.error as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : undefined;
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
  return { amount: BigInt(`${match[1]}${match[2]}${fraction}`), scale: fraction.length };
}
