import { TestBed } from '@angular/core/testing';

import { PosBootstrapResponse, PosDevice, PosOrder } from '../models/pos.models';
import {
  POS_OFFLINE_DATABASE,
  POS_OFFLINE_STORE_NAMES,
  PosOfflineDatabase,
  PosOfflineStoreName,
  PosOfflineTransaction,
  PosOfflineTransactionMode
} from './pos-offline-database';
import { PosOfflineQueueService, PosOfflineStorageError, QueuedPosCommandInput } from './pos-offline-queue.service';

describe('PosOfflineQueueService', () => {
  let database: FakePosOfflineDatabase;
  let service: PosOfflineQueueService;

  beforeEach(async () => {
    database = new FakePosOfflineDatabase();
    TestBed.configureTestingModule({
      providers: [PosOfflineQueueService, { provide: POS_OFFLINE_DATABASE, useValue: database }]
    });
    service = TestBed.inject(PosOfflineQueueService);
    await service.useEnterprise('enterprise-1');
  });

  it('orders commands by clientCreatedAt, reuses the mutation id and recovers SENDING after reload', async () => {
    const later = await service.enqueue(createOrderInput('local-order-2', '2026-07-27T10:00:02.000Z'));
    const earlier = await service.enqueue(createOrderInput('local-order-1', '2026-07-27T10:00:01.000Z'));

    await service.markSending(earlier.clientMutationId);
    await service.useEnterprise('enterprise-1');

    const commands = await service.listCommands();
    expect(commands.map(({ clientMutationId }) => clientMutationId)).toEqual([
      earlier.clientMutationId,
      later.clientMutationId
    ]);
    expect(commands[0].status).toBe('PENDING');
    expect(commands[0].attempts).toBe(1);
    expect(service.replayRequest(commands[0]).idempotencyKey).toBe(commands[0].clientMutationId);
    expect('clientMutationId' in commands[0].data).toBeFalse();
  });

  it('rolls back order plus command atomically and exposes quota failure', async () => {
    database.failOnPutNumber = 2;
    let failure: unknown;

    try {
      await service.enqueueWithOrder(createOrder('local-order-1'), createOrderInput('local-order-1'));
    } catch (error: unknown) {
      failure = error;
    }

    expect(failure instanceof PosOfflineStorageError ? failure.code : null).toBe('POS_OFFLINE_STORAGE_QUOTA_EXCEEDED');
    database.failOnPutNumber = null;
    expect(await service.getOrders()).toEqual([]);
    expect(await service.listCommands()).toEqual([]);
  });

  it('deletes confirmed commands, replaces authoritative orders and removes closed orders', async () => {
    const local = createOrder('order-1');
    const addLine = await service.enqueueWithOrder(local, addLineInput(local.id, 'local-line-1'));
    if (!addLine) throw new Error('EXPECTED_ADD_LINE_COMMAND');
    await service.confirmCommand(addLine.clientMutationId, { ...local, version: 2 }, 'server-line-1');

    expect(await service.listCommands()).toEqual([]);
    const stored = (await service.getOrders())[0];
    expect('kind' in stored ? null : stored.version).toBe(2);

    const send = await service.enqueue({
      type: 'SEND_ORDER',
      aggregateId: local.id,
      data: {
        deviceId: 'device-1',
        clientCreatedAt: '2026-07-27T10:10:00.000Z',
        expectedVersion: 2
      }
    });
    await service.confirmCommand(send.clientMutationId, {
      ...local,
      version: 3,
      status: 'PAID',
      closedAt: '2026-07-27T11:00:00.000Z'
    });

    expect(await service.listCommands()).toEqual([]);
    expect(await service.getOrders()).toEqual([]);
  });

  it('rejects full fiscal customer data from the offline queue', async () => {
    const input: QueuedPosCommandInput = {
      type: 'FINALIZE_ORDER',
      aggregateId: 'order-1',
      data: {
        cashRegisterId: 'cash-register-1',
        clientCreatedAt: '2026-07-27T10:10:00.000Z',
        expectedVersion: 1,
        fiscalCustomer: { legalName: 'Cliente SL', taxId: 'B12345678', fiscalAddress: 'Calle 1' }
      }
    };

    await expectAsync(service.enqueue(input)).toBeRejectedWithError(
      PosOfflineStorageError,
      'POS_OFFLINE_SENSITIVE_COMMAND_NOT_ALLOWED'
    );
  });

  it('compacts local line edits and retargets pending commands when CREATE_ORDER is confirmed', async () => {
    const local = createOrder('local-order-1');
    const create = await service.enqueueWithOrder(local, createOrderInput(local.id));
    if (!create) throw new Error('EXPECTED_CREATE_ORDER_COMMAND');
    const added = await service.enqueueWithOrder(local, addLineInput(local.id, 'local-line-1'));
    if (!added) throw new Error('EXPECTED_ADD_LINE_COMMAND');

    const compacted = await service.enqueueWithOrder(local, updateLineInput(local.id, 'local-line-1', '3'));
    expect(compacted?.type).toBe('ADD_LINE');
    if (compacted?.type === 'ADD_LINE') {
      expect(compacted.data.quantity).toBe('3');
      expect(compacted.deviceId).toBe(compacted.data.deviceId);
      expect(compacted.clientCreatedAt).toBe(compacted.data.clientCreatedAt);
      expect(compacted.expectedVersion).toBe(compacted.data.expectedVersion);
    }

    await service.enqueueWithOrder(local, addLineInput(local.id, 'local-line-2'));
    expect(await service.enqueueWithOrder(local, removeLineInput(local.id, 'local-line-2'))).toBeNull();

    await service.confirmCommand(create.clientMutationId, { ...local, id: 'server-order-1' });
    const commands = await service.listCommands();
    expect(commands.length).toBe(1);
    expect(commands[0].type).toBe('ADD_LINE');
    expect(commands[0].aggregateId).toBe('server-order-1');
    expect(commands[0].targetId).toBe('local-line-1');
    expect((await service.getOrders()).map(({ id }) => id)).toEqual(['server-order-1']);

    const pendingAdd = await service.markSending(commands[0].clientMutationId);
    await service.enqueueWithOrder(
      { ...local, id: 'server-order-1' },
      updateLineInput('server-order-1', 'local-line-1', '4')
    );
    await service.confirmCommand(
      pendingAdd.clientMutationId,
      { ...local, id: 'server-order-1', version: 5 },
      'server-line-1'
    );
    const retargeted = await service.listCommands();
    expect(retargeted.length).toBe(1);
    expect(retargeted[0].type).toBe('UPDATE_LINE');
    expect(retargeted[0].targetId).toBe('server-line-1');
    expect(retargeted[0].expectedVersion).toBe(5);
    if (retargeted[0].type !== 'UPDATE_LINE') throw new Error('EXPECTED_UPDATE_LINE_COMMAND');
    expect(retargeted[0].data.expectedVersion).toBe(5);
  });

  it('keeps the bootstrap ISO cursor separate from the opaque operational cursor', async () => {
    const device = createDevice();
    await service.saveDevice(device);
    await service.cacheBootstrap(createBootstrap(device));
    await service.setSyncCursor('opaque-operational-cursor');

    expect((await service.getCachedBootstrap())?.cursor).toBe('2026-07-27T10:00:00.000Z');
    expect(await service.getSyncCursor()).toBe('opaque-operational-cursor');
    expect((await service.getDevice())?.lastSyncAt).toBeDefined();

    await service.saveDevice(device);
    expect(await service.getSyncCursor()).toBe('opaque-operational-cursor');

    await service.clearDevice();
    expect(await service.getDevice()).toBeNull();
  });

  it('never exposes another enterprise orders or commands', async () => {
    await service.enqueueWithOrder(createOrder('order-enterprise-1'), createOrderInput('order-enterprise-1'));

    await service.useEnterprise('enterprise-2');
    expect(await service.getOrders()).toEqual([]);
    expect(await service.listCommands()).toEqual([]);

    await service.useEnterprise('enterprise-1');
    expect((await service.getOrders()).map(({ id }) => id)).toEqual(['order-enterprise-1']);
    expect(await service.listCommands()).toHaveSize(1);
  });
});

class FakePosOfflineDatabase implements PosOfflineDatabase {
  readonly stores = Object.fromEntries(
    POS_OFFLINE_STORE_NAMES.map((name) => [name, new Map<IDBValidKey, unknown>()])
  ) as Record<PosOfflineStoreName, Map<IDBValidKey, unknown>>;
  failOnPutNumber: number | null = null;

  async transaction<T>(
    stores: readonly PosOfflineStoreName[],
    mode: PosOfflineTransactionMode,
    work: (transaction: PosOfflineTransaction) => Promise<T>
  ): Promise<T> {
    const working = Object.fromEntries(
      POS_OFFLINE_STORE_NAMES.map((name) => [name, new Map(this.stores[name])])
    ) as Record<PosOfflineStoreName, Map<IDBValidKey, unknown>>;
    let putCount = 0;
    const transaction: PosOfflineTransaction = {
      get: async <TValue>(store: PosOfflineStoreName, key: IDBValidKey) =>
        working[store].get(key) as TValue | undefined,
      getAll: async <TValue>(store: PosOfflineStoreName) => [...working[store].values()] as TValue[],
      put: async <TValue>(store: PosOfflineStoreName, value: TValue) => {
        putCount++;
        if (this.failOnPutNumber === putCount) throw new DOMException('quota', 'QuotaExceededError');
        working[store].set(recordKey(store, value), value);
      },
      delete: async (store: PosOfflineStoreName, key: IDBValidKey) => {
        working[store].delete(key);
      }
    };

    const result = await work(transaction);
    if (mode === 'readwrite') stores.forEach((store) => (this.stores[store] = working[store]));
    return result;
  }

  close(): void {}
}

function recordKey(store: PosOfflineStoreName, value: unknown): IDBValidKey {
  if (typeof value !== 'object' || value === null) throw new Error('INVALID_FAKE_RECORD');
  const record = value as Record<string, unknown>;
  const key =
    store === 'device' || store === 'bootstrap'
      ? record['enterpriseId']
      : store === 'orders'
        ? record['orderId']
        : record['clientMutationId'];
  if (typeof key !== 'string') throw new Error('INVALID_FAKE_KEY');
  return key;
}

function createOrderInput(aggregateId: string, clientCreatedAt = '2026-07-27T10:00:00.000Z'): QueuedPosCommandInput {
  return {
    type: 'CREATE_ORDER',
    aggregateId,
    data: {
      deviceId: 'device-1',
      clientCreatedAt,
      channel: 'TAKEAWAY'
    }
  };
}

function addLineInput(aggregateId: string, targetId: string): QueuedPosCommandInput {
  return {
    type: 'ADD_LINE',
    aggregateId,
    targetId,
    data: {
      deviceId: 'device-1',
      clientCreatedAt: '2026-07-27T10:05:00.000Z',
      expectedVersion: 1,
      menuItemId: 'menu-item-1',
      quantity: '1'
    }
  };
}

function updateLineInput(aggregateId: string, targetId: string, quantity: string): QueuedPosCommandInput {
  return {
    type: 'UPDATE_LINE',
    aggregateId,
    targetId,
    data: {
      deviceId: 'device-1',
      clientCreatedAt: '2026-07-27T10:06:00.000Z',
      expectedVersion: 2,
      quantity
    }
  };
}

function removeLineInput(aggregateId: string, targetId: string): QueuedPosCommandInput {
  return {
    type: 'REMOVE_LINE',
    aggregateId,
    targetId,
    data: {
      deviceId: 'device-1',
      clientCreatedAt: '2026-07-27T10:07:00.000Z',
      expectedVersion: 2
    }
  };
}

function createOrder(id: string): PosOrder {
  const timestamp = '2026-07-27T10:00:00.000Z';
  return {
    id,
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    tableId: null,
    orderDate: timestamp,
    orderNumber: 1,
    channel: 'TAKEAWAY',
    status: 'OPEN',
    guestCount: null,
    note: null,
    version: 1,
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
    openedAt: timestamp,
    closedAt: null,
    cancelledAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lines: [],
    kitchenTickets: [],
    payments: [],
    refunds: [],
    fiscalDocuments: []
  };
}

function createDevice(): PosDevice {
  return {
    id: 'device-1',
    enterpriseId: 'enterprise-1',
    name: 'Caja',
    code: 'REGISTER-1',
    type: 'REGISTER',
    status: 'ACTIVE',
    lastSeenAt: null,
    appVersion: null,
    createdByUserId: 'user-1',
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z'
  };
}

function createBootstrap(device: PosDevice): PosBootstrapResponse {
  return {
    settings: {
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
      createdAt: '2026-07-27T10:00:00.000Z',
      updatedAt: '2026-07-27T10:00:00.000Z'
    },
    device,
    areas: [],
    tables: [],
    kitchenStations: [],
    menuCategories: [],
    modifierGroups: [],
    menuItems: [],
    cashSession: null,
    changes: [],
    cursor: '2026-07-27T10:00:00.000Z'
  };
}
