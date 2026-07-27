import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { QueuedPosCommand } from '../models/pos-command.models';
import { LocalPosOrder } from '../models/pos-local.models';
import { PosBootstrapResponse, PosDevice, PosOrder, PosSettings } from '../models/pos.models';
import {
  CachedPosBootstrap,
  CachedPosDevice,
  OfflineStoredOrder,
  PosOfflineQueueService,
  PosOfflineStorageError
} from './pos-offline-queue.service';
import { PosSessionStore } from './pos-session.store';
import { PosService } from './pos.service';
import { PosSyncCallbacks, PosSyncService } from './pos-sync.service';

describe('PosSessionStore offline', () => {
  let store: PosSessionStore;
  let posService: jasmine.SpyObj<PosService>;
  let queue: jasmine.SpyObj<PosOfflineQueueService>;
  let sync: jasmine.SpyObj<PosSyncService>;
  let callbacks: PosSyncCallbacks;
  let storedOrders: OfflineStoredOrder[];
  let storedCommands: QueuedPosCommand[];
  let online: boolean;

  beforeEach(() => {
    online = false;
    spyOnProperty(navigator, 'onLine', 'get').and.callFake(() => online);
    storedOrders = [];
    storedCommands = [];
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'getBootstrap',
      'voidLine',
      'openCashSession',
      'addPayment',
      'getOrder',
      'getCurrentCashSession',
      'finalizeOrder'
    ]);
    queue = jasmine.createSpyObj<PosOfflineQueueService>('PosOfflineQueueService', [
      'useEnterprise',
      'getCachedBootstrap',
      'getDevice',
      'getOrders',
      'listCommands',
      'saveDevice',
      'clearDevice',
      'cacheBootstrap',
      'enqueueWithOrder',
      'discardAggregateCommands',
      'saveOrder',
      'close'
    ]);
    sync = jasmine.createSpyObj<PosSyncService>('PosSyncService', ['start', 'requestSync', 'stop']);
    queue.useEnterprise.and.resolveTo();
    queue.getCachedBootstrap.and.resolveTo(cachedBootstrap());
    queue.getDevice.and.resolveTo(cachedDevice());
    queue.getOrders.and.callFake(async () => [...storedOrders]);
    queue.listCommands.and.callFake(async () => [...storedCommands]);
    queue.saveDevice.and.resolveTo();
    queue.clearDevice.and.resolveTo();
    queue.cacheBootstrap.and.resolveTo();
    queue.saveOrder.and.resolveTo();
    queue.enqueueWithOrder.and.callFake(async (order, input) => {
      storedOrders = [...storedOrders.filter(({ id }) => id !== order.id), order];
      const command = {
        ...input,
        clientMutationId: crypto.randomUUID(),
        enterpriseId: 'enterprise-1',
        deviceId: input.data.deviceId,
        clientCreatedAt: input.data.clientCreatedAt,
        ...('expectedVersion' in input.data ? { expectedVersion: input.data.expectedVersion } : {}),
        status: 'PENDING',
        attempts: 0
      } as QueuedPosCommand;
      storedCommands.push(command);
      return command;
    });
    queue.discardAggregateCommands.and.callFake(async (aggregateId, authoritative) => {
      storedCommands = storedCommands.filter((command) => command.aggregateId !== aggregateId);
      storedOrders = storedOrders.filter(({ id }) => id !== aggregateId);
      if (authoritative) storedOrders.push(authoritative);
    });
    sync.start.and.callFake((value) => {
      callbacks = value;
    });
    sync.requestSync.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        PosSessionStore,
        { provide: PosService, useValue: posService },
        { provide: PosOfflineQueueService, useValue: queue },
        { provide: PosSyncService, useValue: sync }
      ]
    });
    store = TestBed.inject(PosSessionStore);
  });

  it('hydrates bootstrap, device, orders and commands from cache before any request', async () => {
    const local = localOrder();
    storedOrders = [local];
    storedCommands = [createCommand(local.id)];

    await store.initialize('enterprise-1');
    store.selectOrder(local.id);

    expect(posService.getBootstrap).not.toHaveBeenCalled();
    expect(store.settings()?.currency).toBe('EUR');
    expect(store.device()?.id).toBe('device-1');
    expect(store.selectedOrder()?.source).toBe('LOCAL');
    expect(store.selectedOrder()?.temporaryNumber).toBe('L-LOCAL001');
    expect(store.pendingCommandCount()).toBe(1);
    expect(store.cachedAt()).toBe('2026-07-27T09:00:00.000Z');
    expect(store.lastSyncAt()).toBe('2026-07-27T09:30:00.000Z');
    expect(store.syncState()).toBe('OFFLINE');
  });

  it('persists an offline order before exposing it and never starts network sync offline', async () => {
    await store.initialize('enterprise-1');

    await store.createOrder('TAKEAWAY');

    expect(queue.enqueueWithOrder).toHaveBeenCalledTimes(1);
    expect(store.selectedOrder()?.source).toBe('LOCAL');
    expect(store.selectedOrder()?.serverVersion).toBeNull();
    expect(store.pendingCommandCount()).toBe(1);
    expect(sync.requestSync).not.toHaveBeenCalled();

    await store.addItem('menu-item-1');
    const input = queue.enqueueWithOrder.calls.mostRecent().args[1];
    expect(input.type).toBe('ADD_LINE');
    expect(input.type === 'ADD_LINE' && input.data.expectedVersion).toBe(1);
    expect(store.pendingCommandCount()).toBe(2);
  });

  it('does not mutate memory when atomic storage fails', async () => {
    await store.initialize('enterprise-1');
    queue.enqueueWithOrder.and.rejectWith(new PosOfflineStorageError('POS_OFFLINE_STORAGE_QUOTA_EXCEEDED'));

    await store.createOrder('DINE_IN');

    expect(store.orders()).toEqual([]);
    expect(store.selectedOrder()).toBeNull();
    expect(store.storageErrorCode()).toBe('POS_OFFLINE_STORAGE_QUOTA_EXCEEDED');
    expect(store.operationErrorCode()).toBe('POS_OFFLINE_STORAGE_QUOTA_EXCEEDED');
  });

  it('uses the ISO bootstrap cursor, retries once without it and starts operational sync', async () => {
    online = true;
    await store.initialize('enterprise-1');
    posService.getBootstrap.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'INVALID_SYNC_CURSOR' } })),
      of(bootstrap())
    );

    await store.activateDevice('device-1');

    expect(posService.getBootstrap.calls.allArgs()).toEqual([
      ['device-1', '2026-07-27T09:00:00.000Z', 'enterprise-1'],
      ['device-1', undefined, 'enterprise-1']
    ]);
    expect(queue.cacheBootstrap).toHaveBeenCalledOnceWith(jasmine.objectContaining({ cursor: 'bootstrap-2' }));
    expect(queue.saveDevice).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 'device-1' }));
    expect(sync.requestSync).toHaveBeenCalledTimes(1);
  });

  it('applies sync conflicts and discards every aggregate command when choosing the server', async () => {
    online = true;
    const server = order();
    storedOrders = [server];
    storedCommands = [addLineCommand(server.id, 'CONFLICT')];
    await store.initialize('enterprise-1');
    store.selectOrder(server.id);

    await callbacks.conflict?.(storedCommands[0], server, 'ORDER_VERSION_CONFLICT');
    expect(store.conflictOrder()).toEqual({ id: server.id, orderNumber: 7, version: 4 });
    expect(store.syncState()).toBe('CONFLICT');

    await store.useServerConflict();

    expect(queue.discardAggregateCommands).toHaveBeenCalledOnceWith(server.id, server);
    expect(store.pendingCommandCount()).toBe(0);
    expect(store.conflictOrder()).toBeNull();
    expect(store.selectedOrder()?.serverVersion).toBe(4);
  });

  it('keeps the next aggregate conflict actionable after resolving the first one', async () => {
    const first = order();
    const second = { ...order(), id: 'order-2', orderNumber: 8 };
    storedOrders = [first, second];
    storedCommands = [addLineCommand(first.id, 'CONFLICT'), addLineCommand(second.id, 'CONFLICT')];
    await store.initialize('enterprise-1');

    expect(store.conflictOrder()?.id).toBe(first.id);
    await store.useServerConflict();

    expect(store.conflictOrder()).toEqual({ id: second.id, orderNumber: 8, version: 4 });
    expect(store.syncState()).toBe('CONFLICT');
  });

  it('invalidates a cached device without deleting queued orders and restarts sync after reselection', async () => {
    online = true;
    await store.initialize('enterprise-1');

    await store.invalidateCachedDevice();

    expect(sync.stop).toHaveBeenCalled();
    expect(queue.clearDevice).toHaveBeenCalledTimes(1);
    expect(queue.discardAggregateCommands).not.toHaveBeenCalled();
    expect(store.device()).toBeNull();

    posService.getBootstrap.and.returnValue(of(bootstrap()));
    await store.activateDevice('device-1');
    expect(sync.start).toHaveBeenCalledTimes(2);
    expect(sync.requestSync).toHaveBeenCalledTimes(1);
  });

  it('keeps cached data visible when operational sync fails transiently', async () => {
    const local = localOrder();
    storedOrders = [local];
    await store.initialize('enterprise-1');

    callbacks.error?.('POS_SYNC_FAILED');

    expect(store.orders()).toHaveSize(1);
    expect(store.errorCode()).toBeNull();
    expect(store.syncErrorCode()).toBe('POS_SYNC_FAILED');
    expect(store.syncState()).toBe('ERROR');

    store.reset();
    expect(store.syncErrorCode()).toBeNull();
  });

  it('never pays or finalizes offline or while the server order still has pending commands', async () => {
    const server = order();
    storedOrders = [server];
    await store.initialize('enterprise-1');
    store.selectOrder(server.id);

    await store.finalizeSelectedOrder();
    await store.addPayment('CASH', '10.00');

    expect(posService.finalizeOrder).not.toHaveBeenCalled();
    expect(posService.addPayment).not.toHaveBeenCalled();
    expect(store.operationErrorCode()).toBe('POS_ONLINE_REQUIRED');

    online = true;
    storedCommands = [addLineCommand(server.id, 'PENDING')];
    await callbacks.commandChanged?.(storedCommands[0]);
    await store.finalizeSelectedOrder();

    expect(posService.finalizeOrder).not.toHaveBeenCalled();
    expect(store.operationErrorCode()).toBe('POS_ORDER_SYNC_PENDING');
  });

  it('reset only closes the current namespace and preserves persistent data', async () => {
    await store.initialize('enterprise-1');

    store.reset();

    expect(queue.close).toHaveBeenCalledTimes(1);
    expect(queue.discardAggregateCommands).not.toHaveBeenCalled();
    expect(store.orders()).toEqual([]);
    expect(store.syncState()).toBe('OFFLINE');
  });

  it('stops sync and closes IndexedDB when the route-scoped store is destroyed', async () => {
    await store.initialize('enterprise-1');

    store.ngOnDestroy();

    expect(sync.stop).toHaveBeenCalledTimes(2);
    expect(queue.close).toHaveBeenCalledTimes(1);
  });
});

function cachedDevice(): CachedPosDevice {
  return {
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    code: 'REG-1',
    device: device(),
    lastValidatedAt: '2026-07-27T09:00:00.000Z',
    syncCursor: 'operational-1',
    lastSyncAt: '2026-07-27T09:30:00.000Z'
  };
}

function cachedBootstrap(): CachedPosBootstrap {
  return {
    enterpriseId: 'enterprise-1',
    settings: settings(),
    areas: [],
    tables: [],
    kitchenStations: [],
    menuCategories: [],
    modifierGroups: [],
    menuItems: [],
    cursor: '2026-07-27T09:00:00.000Z',
    cachedAt: '2026-07-27T09:00:00.000Z'
  };
}

function bootstrap(): PosBootstrapResponse {
  return {
    settings: settings(),
    device: device(),
    areas: [],
    tables: [],
    kitchenStations: [],
    menuCategories: [],
    modifierGroups: [],
    menuItems: [],
    cashSession: null,
    changes: [],
    cursor: 'bootstrap-2'
  };
}

function settings(): PosSettings {
  return {
    id: 'settings-1',
    enterpriseId: 'enterprise-1',
    enabled: true,
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    pricesIncludeTax: true,
    allowNegativeStock: false,
    receiptFooter: null,
    fiscalMode: 'SANDBOX',
    issuerLegalName: null,
    issuerTaxId: null,
    issuerAddress: null,
    fiscalSeriesPrefix: null,
    createdAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z'
  };
}

function device(): PosDevice {
  return {
    id: 'device-1',
    enterpriseId: 'enterprise-1',
    name: 'Caja',
    code: 'REG-1',
    type: 'REGISTER',
    status: 'ACTIVE',
    lastSeenAt: null,
    appVersion: null,
    createdByUserId: 'user-1',
    createdAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z'
  };
}

function localOrder(): LocalPosOrder {
  return {
    kind: 'LOCAL_POS_ORDER',
    id: 'local:local001',
    temporaryNumber: 'L-LOCAL001',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    tableId: null,
    channel: 'TAKEAWAY',
    guestCount: null,
    note: null,
    clientCreatedAt: '2026-07-27T10:00:00.000Z'
  };
}

function order(): PosOrder {
  return {
    id: 'order-1',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    tableId: null,
    orderDate: '2026-07-27T10:00:00.000Z',
    orderNumber: 7,
    channel: 'TAKEAWAY',
    status: 'SENT',
    guestCount: null,
    note: null,
    version: 4,
    subtotalGross: '10.00',
    discountGross: '0.00',
    taxGross: '0.91',
    totalGross: '10.00',
    paidGross: '0.00',
    costNet: null,
    costStatus: 'PENDING',
    openedByUserId: 'user-1',
    closedByUserId: null,
    cancelledByUserId: null,
    cancellationReason: null,
    openedAt: '2026-07-27T10:00:00.000Z',
    closedAt: null,
    cancelledAt: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    lines: [],
    kitchenTickets: [],
    payments: [],
    refunds: [],
    fiscalDocuments: []
  };
}

function createCommand(aggregateId: string): QueuedPosCommand {
  return {
    type: 'CREATE_ORDER',
    aggregateId,
    clientMutationId: 'mutation-create',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    clientCreatedAt: '2026-07-27T10:00:00.000Z',
    data: {
      deviceId: 'device-1',
      clientCreatedAt: '2026-07-27T10:00:00.000Z',
      channel: 'TAKEAWAY'
    },
    status: 'PENDING',
    attempts: 0
  };
}

function addLineCommand(
  aggregateId: string,
  status: Extract<QueuedPosCommand, { type: 'ADD_LINE' }>['status']
): Extract<QueuedPosCommand, { type: 'ADD_LINE' }> {
  return {
    type: 'ADD_LINE',
    aggregateId,
    targetId: 'local-line:1',
    clientMutationId: 'mutation-line',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    clientCreatedAt: '2026-07-27T10:01:00.000Z',
    expectedVersion: 4,
    data: {
      deviceId: 'device-1',
      clientCreatedAt: '2026-07-27T10:01:00.000Z',
      expectedVersion: 4,
      menuItemId: 'menu-item-1',
      quantity: '1'
    },
    status,
    attempts: 0
  };
}
