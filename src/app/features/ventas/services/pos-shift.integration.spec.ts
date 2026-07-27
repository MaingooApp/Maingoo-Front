import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import {
  CashSessionWithMovements,
  MenuItem,
  OperationalStockSyncJob,
  Payment,
  PosBootstrapResponse,
  PosDevice,
  PosOperationalChange,
  PosOrder,
  PosOrderLine
} from '../models/pos.models';
import {
  POS_OFFLINE_DATABASE,
  POS_OFFLINE_STORE_NAMES,
  PosOfflineDatabase,
  PosOfflineStoreName,
  PosOfflineTransaction,
  PosOfflineTransactionMode
} from './pos-offline-database';
import { PosOfflineQueueService } from './pos-offline-queue.service';
import { PosSessionStore } from './pos-session.store';
import { PosService } from './pos.service';
import { PosSyncService } from './pos-sync.service';

describe('TPV sale shift integration', () => {
  let online: boolean;
  let cashOpened: boolean;
  let finalized: boolean;
  let store: PosSessionStore;
  let queue: PosOfflineQueueService;
  let sync: PosSyncService;
  let posService: jasmine.SpyObj<PosService>;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-07-27T10:00:00.000Z'));
    online = true;
    cashOpened = false;
    finalized = false;
    spyOnProperty(navigator, 'onLine', 'get').and.callFake(() => online);

    posService = jasmine.createSpyObj<PosService>('PosService', [
      'getBootstrap',
      'getSync',
      'openCashSession',
      'createOrder',
      'addLine',
      'sendOrder',
      'addPayment',
      'getOrder',
      'getCurrentCashSession',
      'finalizeOrder'
    ]);
    posService.getBootstrap.and.returnValue(of(bootstrap()));
    posService.getSync.and.callFake(() => {
      const changes: PosOperationalChange[] = cashOpened
        ? [
            {
              resourceType: 'CASH_SESSION',
              resourceId: 'cash-session-1',
              operation: 'UPSERT',
              updatedAt: '2026-07-27T11:00:00.000Z',
              data: cashSession()
            },
            ...(finalized
              ? [
                  {
                    resourceType: 'STOCK_SYNC_JOB' as const,
                    resourceId: 'stock-job-1',
                    operation: 'UPSERT' as const,
                    updatedAt: '2026-07-27T11:00:01.000Z',
                    data: stockJob()
                  }
                ]
              : [])
          ]
        : [];
      return of({ changes, serverCursor: finalized ? 'cursor-finalized' : 'cursor-open' });
    });
    posService.openCashSession.and.callFake(() => {
      cashOpened = true;
      return of(cashSession());
    });

    TestBed.configureTestingModule({
      providers: [
        PosSessionStore,
        PosOfflineQueueService,
        PosSyncService,
        { provide: PosService, useValue: posService },
        { provide: POS_OFFLINE_DATABASE, useValue: new MemoryPosOfflineDatabase() }
      ]
    });
    store = TestBed.inject(PosSessionStore);
    queue = TestBed.inject(PosOfflineQueueService);
    sync = TestBed.inject(PosSyncService);
  });

  afterEach(() => {
    store.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('runs a sale through reload, ordered replay, payment, finalization and receipt state', async () => {
    await store.initialize('enterprise-1');
    await store.activateDevice('device-1');
    await store.openCashSession('100.00');

    online = false;
    store.connectivityChanged(false);
    await store.createOrder('TAKEAWAY');
    await store.addItem('menu-item-1');
    await store.sendSelectedOrder();

    const queuedBeforeReload = await queue.listCommands();
    expect(queuedBeforeReload.map(({ type }) => type)).toEqual(['CREATE_ORDER', 'ADD_LINE', 'SEND_ORDER']);
    expect(store.syncState()).toBe('OFFLINE');

    store.reset();
    await store.initialize('enterprise-1');
    store.selectOrder(store.orders()[0].id);

    expect(store.selectedOrder()?.source).toBe('LOCAL');
    expect(store.pendingCommandCount()).toBe(3);

    const serverLine = line();
    posService.createOrder.and.returnValue(of(order(1, 'OPEN')));
    posService.addLine.and.returnValue(of(order(2, 'OPEN', [serverLine])));
    posService.sendOrder.and.returnValue(of(order(3, 'SENT', [serverLine])));

    online = true;
    store.connectivityChanged(true);
    await sync.requestSync();

    expect(posService.createOrder.calls.mostRecent().args[1]).toBe(queuedBeforeReload[0].clientMutationId);
    expect(posService.addLine.calls.mostRecent().args[2]).toBe(queuedBeforeReload[1].clientMutationId);
    expect(posService.sendOrder.calls.mostRecent().args[2]).toBe(queuedBeforeReload[2].clientMutationId);
    expect(store.selectedOrder()?.source).toBe('SERVER');
    expect(store.selectedOrder()?.serverStatus).toBe('SENT');
    expect(store.pendingCommandCount()).toBe(0);
    expect(store.cashSession()?.status).toBe('OPEN');

    const paid = order(4, 'SENT', [serverLine], '10.00', [payment()]);
    posService.addPayment.and.returnValue(of({ ...payment(), orderVersion: 4 }));
    posService.getOrder.and.returnValue(of(paid));
    posService.getCurrentCashSession.and.returnValue(of({ ...cashSession(), expectedCash: '110.00' }));
    await store.addPayment('CASH', '10.00');

    const closed = order(5, 'PAID', [serverLine], '10.00', [payment()], true);
    posService.finalizeOrder.and.callFake(() => {
      finalized = true;
      return of(closed);
    });
    await store.finalizeSelectedOrder();

    expect(store.operationErrorCode()).toBeNull();
    expect(store.selectedAuthoritativeOrder()?.status).toBe('PAID');
    expect(store.selectedAuthoritativeOrder()?.fiscalDocuments[0].number).toBe(42);
    expect(store.stockSyncJobs()).toEqual([stockJob()]);
    expect(await queue.listCommands()).toEqual([]);
    expect(await queue.getOrders()).toEqual([]);
  });

  it('keeps a conflicting aggregate visible until the operator accepts the server copy', async () => {
    await store.initialize('enterprise-1');
    await store.activateDevice('device-1');

    online = false;
    store.connectivityChanged(false);
    await store.createOrder('TAKEAWAY');
    await store.sendSelectedOrder();

    posService.createOrder.and.returnValue(of(order(1, 'OPEN')));
    posService.sendOrder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'ORDER_VERSION_CONFLICT' } }))
    );
    posService.getOrder.and.returnValue(of(order(4, 'SENT')));

    online = true;
    store.connectivityChanged(true);
    await sync.requestSync();

    expect(store.syncState()).toBe('CONFLICT');
    expect(store.conflictOrder()).toEqual({ id: 'server-order-1', orderNumber: 7, version: 4 });
    expect(store.pendingCommandCount()).toBe(1);

    await store.useServerConflict();

    expect(store.conflictOrder()).toBeNull();
    expect(store.pendingCommandCount()).toBe(0);
    expect(store.selectedAuthoritativeOrder()?.version).toBe(4);
  });
});

class MemoryPosOfflineDatabase implements PosOfflineDatabase {
  private stores = Object.fromEntries(
    POS_OFFLINE_STORE_NAMES.map((name) => [name, new Map<IDBValidKey, unknown>()])
  ) as Record<PosOfflineStoreName, Map<IDBValidKey, unknown>>;

  async transaction<T>(
    stores: readonly PosOfflineStoreName[],
    mode: PosOfflineTransactionMode,
    work: (transaction: PosOfflineTransaction) => Promise<T>
  ): Promise<T> {
    const working = Object.fromEntries(
      POS_OFFLINE_STORE_NAMES.map((name) => [name, new Map(this.stores[name])])
    ) as Record<PosOfflineStoreName, Map<IDBValidKey, unknown>>;
    const transaction: PosOfflineTransaction = {
      get: async <TValue>(store: PosOfflineStoreName, key: IDBValidKey) =>
        working[store].get(key) as TValue | undefined,
      getAll: async <TValue>(store: PosOfflineStoreName) => [...working[store].values()] as TValue[],
      put: async <TValue>(store: PosOfflineStoreName, value: TValue) => {
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

function bootstrap(): PosBootstrapResponse {
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
      createdAt: '2026-07-27T08:00:00.000Z',
      updatedAt: '2026-07-27T08:00:00.000Z'
    },
    device: device(),
    areas: [],
    tables: [],
    kitchenStations: [],
    menuCategories: [],
    modifierGroups: [],
    menuItems: [menuItem()],
    cashSession: null,
    changes: [],
    cursor: '2026-07-27T08:00:00.000Z'
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

function menuItem(): MenuItem {
  return {
    id: 'menu-item-1',
    enterpriseId: 'enterprise-1',
    categoryId: 'category-1',
    name: 'Menú',
    sku: null,
    description: null,
    imageUrl: null,
    foodPreparationId: null,
    priceGross: '10.00',
    taxRate: '10.00',
    trackStock: true,
    kitchenStationId: 'station-1',
    sortOrder: 0,
    active: true,
    createdAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z',
    modifierGroups: []
  };
}

function line(): PosOrderLine {
  return {
    id: 'server-line-1',
    enterpriseId: 'enterprise-1',
    orderId: 'server-order-1',
    menuItemId: 'menu-item-1',
    categoryId: 'category-1',
    categoryName: 'Comida',
    itemName: 'Menú',
    sku: null,
    foodPreparationId: null,
    unitPriceGross: '10.00',
    taxRate: '10.00',
    quantity: '1',
    discountGross: '0.00',
    lineTotalGross: '10.00',
    trackStock: true,
    estimatedCostNet: '4.00',
    costStatus: 'CALCULATED',
    note: null,
    status: 'SENT',
    voidReason: null,
    voidedByUserId: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    modifiers: [],
    menuItem: { kitchenStationId: 'station-1', kitchenStation: { active: true } }
  };
}

function order(
  version: number,
  status: PosOrder['status'],
  lines: PosOrderLine[] = [],
  paidGross = '0.00',
  payments: Payment[] = [],
  finalizedOrder = false
): PosOrder {
  return {
    id: 'server-order-1',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    tableId: null,
    orderDate: '2026-07-27T10:00:00.000Z',
    orderNumber: 7,
    channel: 'TAKEAWAY',
    status,
    guestCount: null,
    note: null,
    version,
    subtotalGross: '10.00',
    discountGross: '0.00',
    taxGross: '0.91',
    totalGross: '10.00',
    paidGross,
    costNet: finalizedOrder ? '4.00' : null,
    costStatus: finalizedOrder ? 'CALCULATED' : 'PENDING',
    openedByUserId: 'user-1',
    closedByUserId: finalizedOrder ? 'user-1' : null,
    cancelledByUserId: null,
    cancellationReason: null,
    openedAt: '2026-07-27T10:00:00.000Z',
    closedAt: finalizedOrder ? '2026-07-27T11:00:00.000Z' : null,
    cancelledAt: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T11:00:00.000Z',
    lines,
    kitchenTickets: [],
    payments,
    refunds: [],
    fiscalDocuments: finalizedOrder
      ? [
          {
            id: 'fiscal-1',
            enterpriseId: 'enterprise-1',
            orderId: 'server-order-1',
            seriesId: 'series-1',
            type: 'SIMPLIFIED',
            series: 'F',
            number: 42,
            issuedAt: '2026-07-27T11:00:00.000Z',
            issuerLegalName: 'Maingoo Demo',
            issuerTaxId: 'B12345678',
            issuerFiscalAddress: 'Madrid',
            customerLegalName: null,
            customerTaxId: null,
            customerFiscalAddress: null,
            taxBase: '9.09',
            taxGross: '0.91',
            totalGross: '10.00',
            taxBreakdown: {},
            rectifiesDocumentId: null,
            qrPayload: 'https://example.test/receipt',
            createdAt: '2026-07-27T11:00:00.000Z'
          }
        ]
      : []
  };
}

function cashSession(): CashSessionWithMovements {
  return {
    id: 'cash-session-1',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    status: 'OPEN',
    openingAmount: '100.00',
    expectedCash: '100.00',
    countedCash: null,
    difference: null,
    idempotencyKey: 'cash-open-1',
    openedByUserId: 'user-1',
    closedByUserId: null,
    openedAt: '2026-07-27T08:00:00.000Z',
    closedAt: null,
    createdAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z',
    cashMovements: []
  };
}

function payment(): Payment {
  return {
    id: 'payment-1',
    enterpriseId: 'enterprise-1',
    orderId: 'server-order-1',
    cashSessionId: 'cash-session-1',
    method: 'CASH',
    amount: '10.00',
    tenderedAmount: '10.00',
    changeGross: '0.00',
    status: 'RECORDED',
    idempotencyKey: 'payment-key-1',
    externalReference: null,
    createdByUserId: 'user-1',
    createdAt: '2026-07-27T10:55:00.000Z',
    voidedAt: null,
    voidedByUserId: null,
    voidReason: null,
    updatedAt: '2026-07-27T10:55:00.000Z'
  };
}

function stockJob(): OperationalStockSyncJob {
  return {
    id: 'stock-job-1',
    orderId: 'server-order-1',
    status: 'APPLIED',
    attempts: 1,
    nextAttemptAt: '2026-07-27T11:00:00.000Z',
    lastErrorCode: null,
    lastWarningCode: null,
    appliedAt: '2026-07-27T11:00:01.000Z',
    updatedAt: '2026-07-27T11:00:01.000Z',
    createdAt: '2026-07-27T11:00:00.000Z'
  };
}
