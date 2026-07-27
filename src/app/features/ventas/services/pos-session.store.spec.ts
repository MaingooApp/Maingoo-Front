import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import {
  CashSessionWithMovements,
  OperationalPosOrder,
  Payment,
  PosBootstrapResponse,
  PosOperationalChange,
  PosOrder
} from '../models/pos.models';
import { PosSessionStore } from './pos-session.store';
import { PosService } from './pos.service';

describe('PosSessionStore', () => {
  let store: PosSessionStore;
  let posService: jasmine.SpyObj<PosService>;

  beforeEach(() => {
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'getBootstrap',
      'getSync',
      'createOrder',
      'addLine',
      'updateLine',
      'removeLine',
      'sendOrder',
      'voidLine',
      'openCashSession',
      'addPayment',
      'getOrder',
      'getCurrentCashSession',
      'finalizeOrder'
    ]);
    TestBed.configureTestingModule({
      providers: [PosSessionStore, { provide: PosService, useValue: posService }]
    });
    store = TestBed.inject(PosSessionStore);
  });

  it('hydrates bootstrap and drains every operational sync page', async () => {
    const firstPageChanges = Array.from({ length: 200 }, (_, index) =>
      orderChange(createOperationalOrder(`order-${index}`, '10.00', '0.00'))
    );
    posService.getBootstrap.and.returnValue(of(createBootstrap()));
    posService.getSync.and.callFake((_deviceId, cursor) =>
      of(
        cursor
          ? { changes: [], serverCursor: 'cursor-final' }
          : { changes: firstPageChanges, serverCursor: 'cursor-200' }
      )
    );

    await store.load('device-1');

    expect(posService.getBootstrap).toHaveBeenCalledOnceWith('device-1');
    expect(posService.getSync.calls.allArgs()).toEqual([
      ['device-1', undefined],
      ['device-1', 'cursor-200']
    ]);
    expect(store.settings()?.currency).toBe('EUR');
    expect(store.device()?.id).toBe('device-1');
    expect(store.activeOrders()).toHaveSize(200);
    expect(store.syncCursor()).toBe('cursor-final');
    expect(store.syncState()).toBe('ONLINE');
    expect(store.loading()).toBeFalse();
  });

  it('selects an order and calculates its balance without floating point arithmetic', async () => {
    posService.getBootstrap.and.returnValue(of(createBootstrap()));
    posService.getSync.and.returnValue(
      of({
        changes: [orderChange(createOperationalOrder('order-1', '0.30', '0.10'))],
        serverCursor: 'cursor-1'
      })
    );

    await store.load('device-1');
    store.selectOrder('order-1');

    expect(store.selectedOrder()?.id).toBe('order-1');
    expect(store.selectedOrderBalance()).toBe('0.20');
  });

  it('resets loaded state and exposes a stable backend error code', async () => {
    posService.getBootstrap.and.returnValue(of(createBootstrap()));
    posService.getSync.and.returnValue(of({ changes: [], serverCursor: 'cursor-1' }));
    await store.load('device-1');

    store.reset();

    expect(store.device()).toBeNull();
    expect(store.orders()).toEqual([]);
    expect(store.syncState()).toBe('OFFLINE');

    posService.getBootstrap.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'DEVICE_REVOKED' }
          })
      )
    );
    await store.load('device-1');

    expect(store.errorCode()).toBe('DEVICE_REVOKED');
    expect(store.syncState()).toBe('ERROR');
    expect(store.loading()).toBeFalse();
  });

  it('creates, updates, sends and voids an order line using the current authoritative version', async () => {
    await loadStore();
    const created = createOrder('order-1', '10.00', '0.00', 1);
    const withLine = createOrder('order-1', '12.00', '0.00', 2);
    const updated = createOrder('order-1', '18.00', '0.00', 3);
    const sent = createOrder('order-1', '18.00', '0.00', 4, 'SENT');
    const voided = createOrder('order-1', '0.00', '0.00', 5, 'SENT');
    posService.createOrder.and.returnValue(of(created));
    posService.addLine.and.returnValue(of(withLine));
    posService.updateLine.and.returnValue(of(updated));
    posService.sendOrder.and.returnValue(of(sent));
    posService.voidLine.and.returnValue(of(voided));

    await store.createOrder('DINE_IN', 'table-1', 3);
    await store.addItem('menu-item-1', ['modifier-1'], '2', 'Sin sal');
    await store.updateLine('line-1', { quantity: '3' });
    await store.sendSelectedOrder();
    await store.voidSelectedOrderLine('line-1', 'Error de comanda');

    expect(posService.createOrder).toHaveBeenCalledWith(
      jasmine.objectContaining({
        deviceId: 'device-1',
        channel: 'DINE_IN',
        tableId: 'table-1',
        guestCount: 3,
        clientCreatedAt: jasmine.any(String)
      }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(posService.addLine).toHaveBeenCalledWith(
      'order-1',
      jasmine.objectContaining({
        deviceId: 'device-1',
        expectedVersion: 1,
        menuItemId: 'menu-item-1',
        modifierOptionIds: ['modifier-1'],
        quantity: '2',
        note: 'Sin sal'
      }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(posService.updateLine).toHaveBeenCalledWith(
      'order-1',
      'line-1',
      jasmine.objectContaining({ expectedVersion: 2, quantity: '3' }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(posService.sendOrder).toHaveBeenCalledWith(
      'order-1',
      jasmine.objectContaining({ expectedVersion: 3 }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(posService.voidLine).toHaveBeenCalledWith(
      'order-1',
      jasmine.objectContaining({
        deviceId: 'device-1',
        expectedVersion: 4,
        lineId: 'line-1',
        reason: 'Error de comanda'
      }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(store.selectedOrder()?.version).toBe(5);
    expect(store.selectedOrder()?.status).toBe('SENT');
    expect(store.operationPending()).toBeFalse();
  });

  it('removes an open line using the current version and applies the authoritative order', async () => {
    const current = createOperationalOrder('order-1', '10.00', '0.00', 3);
    const updated = createOrder('order-1', '0.00', '0.00', 4);
    await loadStore(current);
    posService.removeLine.and.returnValue(of(updated));

    await store.removeOpenLine('line-1');

    expect(posService.removeLine).toHaveBeenCalledWith(
      'order-1',
      'line-1',
      jasmine.objectContaining({
        deviceId: 'device-1',
        expectedVersion: 3,
        clientCreatedAt: jasmine.any(String)
      }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(store.selectedOrder()?.version).toBe(4);
    expect(store.selectedOrder()?.totalGross).toBe('0.00');
  });

  it('refetches the authoritative order after a payment advances its version', async () => {
    const order = createOperationalOrder('order-1', '10.00', '0.00', 4, 'SENT');
    await loadStore(order, createCashSession());
    const paidOrder = createOrder('order-1', '10.00', '10.00', 5, 'PARTIALLY_PAID');
    const refreshedCashSession = { ...createCashSession(), expectedCash: '60.00' };
    posService.addPayment.and.returnValue(of({ ...createPayment(), orderVersion: 5 }));
    posService.getOrder.and.returnValue(of(paidOrder));
    posService.getCurrentCashSession.and.returnValue(of(refreshedCashSession));

    await store.addPayment('CASH', '10.00');

    expect(posService.addPayment).toHaveBeenCalledWith(
      'order-1',
      jasmine.objectContaining({
        deviceId: 'device-1',
        expectedVersion: 4,
        cashSessionId: 'cash-1',
        method: 'CASH',
        amount: '10.00'
      }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(posService.getOrder).toHaveBeenCalledOnceWith('order-1');
    expect(posService.getCurrentCashSession).toHaveBeenCalledOnceWith('device-1');
    expect(store.selectedOrder()?.version).toBe(5);
    expect(store.selectedOrder()?.paidGross).toBe('10.00');
    expect(store.cashSession()?.expectedCash).toBe('60.00');
  });

  it('refetches a complete order before accepting a partial payment conflict', async () => {
    const localOrder = createOperationalOrder('order-1', '10.00', '0.00', 1);
    const serverOrder = createOrder('order-1', '12.00', '0.00', 2);
    await loadStore(localOrder);
    posService.addLine.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              code: 'ORDER_VERSION_CONFLICT',
              currentOrder: {
                id: serverOrder.id,
                orderNumber: serverOrder.orderNumber,
                version: serverOrder.version,
                lines: [{ status: 'SENT' }]
              }
            }
          })
      )
    );

    await store.addItem('menu-item-1');

    expect(store.selectedOrder()?.version).toBe(1);
    expect(store.conflictOrder()).toEqual({ id: 'order-1', orderNumber: 1, version: 2 });
    expect(store.operationErrorCode()).toBe('ORDER_VERSION_CONFLICT');
    expect(store.syncState()).toBe('CONFLICT');

    posService.getOrder.and.returnValue(of(serverOrder));
    await store.useServerConflict();

    expect(posService.getOrder).toHaveBeenCalledOnceWith('order-1');
    expect(store.selectedOrder()?.version).toBe(2);
    expect(store.selectedOrder()?.payments).toEqual([]);
    expect(store.conflictOrder()).toBeNull();
    expect(store.operationErrorCode()).toBeNull();
    expect(store.syncState()).toBe('ONLINE');
  });

  it('reuses the complete create-order intent after an ambiguous failure and clears it after a 4xx', async () => {
    await loadStore();
    posService.createOrder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }))
    );

    await store.createOrder('TAKEAWAY');
    const firstPayload = posService.createOrder.calls.argsFor(0)[0];
    const firstKey = posService.createOrder.calls.argsFor(0)[1];

    await store.createOrder('DINE_IN');

    expect(posService.createOrder).toHaveBeenCalledTimes(1);
    expect(store.operationErrorCode()).toBe('POS_OPERATION_RECONCILIATION_REQUIRED');

    posService.createOrder.and.returnValue(of(createOrder('order-1', '0.00', '0.00')));
    await store.createOrder('TAKEAWAY');

    expect(posService.createOrder.calls.argsFor(1)).toEqual([firstPayload, firstKey]);

    posService.createOrder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { code: 'VALIDATION_ERROR' } }))
    );
    await store.createOrder('DINE_IN');
    const rejectedKey = posService.createOrder.calls.mostRecent().args[1];

    posService.createOrder.and.returnValue(of(createOrder('order-2', '0.00', '0.00')));
    await store.createOrder('DINE_IN');

    expect(posService.createOrder.calls.mostRecent().args[1]).not.toBe(rejectedKey);
  });

  it('blocks a different order mutation while an add-line result is ambiguous', async () => {
    const order = createOperationalOrder('order-1', '10.00', '0.00', 1);
    await loadStore(order);
    posService.addLine.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }))
    );

    await store.addItem('menu-item-1');
    const firstPayload = posService.addLine.calls.argsFor(0)[1];
    const firstKey = posService.addLine.calls.argsFor(0)[2];
    await store.updateLine('line-1', { quantity: '2' });

    expect(posService.updateLine).not.toHaveBeenCalled();
    expect(store.operationErrorCode()).toBe('POS_OPERATION_RECONCILIATION_REQUIRED');

    posService.addLine.and.returnValue(of(createOrder('order-1', '12.00', '0.00', 2)));
    await store.addItem('menu-item-1');

    expect(posService.addLine.calls.argsFor(1)).toEqual(['order-1', firstPayload, firstKey]);
  });

  it('does not replace an order with a lower server version', async () => {
    const current = createOperationalOrder('order-1', '12.00', '0.00', 2);
    await loadStore(current);
    posService.addLine.and.returnValue(of(createOrder('order-1', '5.00', '0.00', 1)));

    await store.addItem('menu-item-1');

    expect(store.selectedOrder()?.version).toBe(2);
    expect(store.selectedOrder()?.totalGross).toBe('12.00');
  });

  it('blocks every other mutation until a confirmed cash payment is fully refreshed', async () => {
    const order = createOperationalOrder('order-1', '10.00', '0.00', 4, 'SENT');
    await loadStore(order, createCashSession());
    const paidOrder = createOrder('order-1', '10.00', '10.00', 5, 'PARTIALLY_PAID');
    const refreshedCashSession = { ...createCashSession(), expectedCash: '60.00' };
    posService.addPayment.and.returnValue(of({ ...createPayment(), orderVersion: 5 }));
    posService.getOrder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }))
    );

    await store.addPayment('CASH', '10.00');
    await store.addItem('menu-item-2');

    expect(posService.addLine).not.toHaveBeenCalled();
    expect(store.operationErrorCode()).toBe('POS_ORDER_REFRESH_REQUIRED');

    posService.getOrder.and.returnValue(of(paidOrder));
    posService.getCurrentCashSession.and.returnValue(of(refreshedCashSession));
    await store.addPayment('CASH', '10.00');

    expect(posService.addPayment).toHaveBeenCalledTimes(1);
    expect(posService.getOrder).toHaveBeenCalledTimes(2);
    expect(store.selectedOrder()?.version).toBe(5);
    expect(store.cashSession()?.expectedCash).toBe('60.00');
  });

  it('keeps the confirmed payment usable when cash-session refresh is forbidden', async () => {
    const order = createOperationalOrder('order-1', '10.00', '0.00', 4, 'SENT');
    await loadStore(order, createCashSession());
    posService.addPayment.and.returnValue(of({ ...createPayment(), orderVersion: 5 }));
    posService.getOrder.and.returnValue(of(createOrder('order-1', '10.00', '10.00', 5, 'PARTIALLY_PAID')));
    posService.getCurrentCashSession.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'FORBIDDEN' } }))
    );

    await store.addPayment('CASH', '10.00');

    expect(store.selectedOrder()?.version).toBe(5);
    expect(store.operationErrorCode()).toBeNull();
    expect(store.operationPending()).toBeFalse();
  });

  it('opens the cash session and finalizes the selected order with server responses', async () => {
    const paidOrder = createOperationalOrder('order-1', '10.00', '10.00', 2, 'PARTIALLY_PAID');
    await loadStore(paidOrder);
    const cashSession = createCashSession();
    const finalized = createOrder('order-1', '10.00', '10.00', 3, 'PAID');
    posService.openCashSession.and.returnValue(of(cashSession));
    posService.finalizeOrder.and.returnValue(of(finalized));

    await store.openCashSession('50.00');
    await store.finalizeSelectedOrder({
      legalName: 'Cliente SA',
      taxId: 'B12345678',
      fiscalAddress: 'Calle Mayor 1'
    });

    expect(posService.openCashSession).toHaveBeenCalledWith(
      jasmine.objectContaining({
        deviceId: 'device-1',
        openingAmount: '50.00',
        clientCreatedAt: jasmine.any(String)
      }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(posService.finalizeOrder).toHaveBeenCalledWith(
      'order-1',
      jasmine.objectContaining({
        expectedVersion: 2,
        fiscalCustomer: {
          legalName: 'Cliente SA',
          taxId: 'B12345678',
          fiscalAddress: 'Calle Mayor 1'
        }
      }),
      jasmine.stringMatching(UUID_PATTERN)
    );
    expect(store.cashSession()).toBe(cashSession);
    expect(store.selectedOrder()?.status).toBe('PAID');
    expect(posService.getSync).toHaveBeenCalledWith('device-1', 'cursor-1');
    expect(store.syncState()).toBe('ONLINE');
  });

  it('ignores a second submit while the first operation is pending', async () => {
    await loadStore();
    const response = new Subject<PosOrder>();
    posService.createOrder.and.returnValue(response);

    const firstSubmit = store.createOrder('TAKEAWAY');
    await store.createOrder('TAKEAWAY');

    expect(posService.createOrder).toHaveBeenCalledTimes(1);
    expect(store.operationPending()).toBeTrue();

    response.next(createOrder('order-1', '0.00', '0.00'));
    response.complete();
    await firstSubmit;

    expect(store.operationPending()).toBeFalse();
  });

  async function loadStore(
    order?: OperationalPosOrder,
    cashSession: CashSessionWithMovements | null = null
  ): Promise<void> {
    posService.getBootstrap.and.returnValue(of(createBootstrap(cashSession)));
    posService.getSync.and.returnValue(
      of({
        changes: order ? [orderChange(order)] : [],
        serverCursor: 'cursor-1'
      })
    );
    await store.load('device-1');
    if (order) store.selectOrder(order.id);
  }
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createBootstrap(cashSession: CashSessionWithMovements | null = null): PosBootstrapResponse {
  const timestamp = '2026-07-25T10:00:00.000Z';
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
      fiscalMode: 'DISABLED',
      issuerLegalName: null,
      issuerTaxId: null,
      issuerAddress: null,
      fiscalSeriesPrefix: null,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    device: {
      id: 'device-1',
      enterpriseId: 'enterprise-1',
      name: 'Caja',
      code: 'CAJA-1',
      type: 'REGISTER',
      status: 'ACTIVE',
      lastSeenAt: timestamp,
      appVersion: null,
      createdByUserId: 'user-1',
      createdAt: timestamp,
      updatedAt: timestamp
    },
    areas: [],
    tables: [],
    kitchenStations: [],
    menuCategories: [],
    modifierGroups: [],
    menuItems: [],
    cashSession,
    changes: [],
    cursor: timestamp
  };
}

function createOrder(
  id: string,
  totalGross: string,
  paidGross: string,
  version = 1,
  status: PosOrder['status'] = 'OPEN'
): PosOrder {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id,
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    tableId: null,
    orderDate: timestamp,
    orderNumber: 1,
    channel: 'TAKEAWAY',
    status,
    guestCount: null,
    note: null,
    version,
    subtotalGross: totalGross,
    discountGross: '0.00',
    taxGross: '0.00',
    totalGross,
    paidGross,
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

function createOperationalOrder(
  id: string,
  totalGross: string,
  paidGross: string,
  version = 1,
  status: PosOrder['status'] = 'OPEN'
): OperationalPosOrder {
  const order = createOrder(id, totalGross, paidGross, version, status);
  return {
    ...order,
    lines: order.lines.map(({ menuItem: _menuItem, ...line }) => line),
    kitchenTickets: order.kitchenTickets.map(({ station: _station, ...ticket }) => ticket),
    stockSyncJob: null
  };
}

function createCashSession(): CashSessionWithMovements {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id: 'cash-1',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    status: 'OPEN',
    openingAmount: '50.00',
    expectedCash: '50.00',
    countedCash: null,
    difference: null,
    idempotencyKey: 'cash-key',
    openedByUserId: 'user-1',
    closedByUserId: null,
    openedAt: timestamp,
    closedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    cashMovements: []
  };
}

function createPayment(): Payment {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id: 'payment-1',
    enterpriseId: 'enterprise-1',
    orderId: 'order-1',
    cashSessionId: 'cash-1',
    method: 'CASH',
    amount: '10.00',
    tenderedAmount: '10.00',
    changeGross: '0.00',
    status: 'RECORDED',
    idempotencyKey: 'payment-key',
    externalReference: null,
    createdByUserId: 'user-1',
    createdAt: timestamp,
    voidedAt: null,
    voidedByUserId: null,
    voidReason: null,
    updatedAt: timestamp
  };
}

function orderChange(order: OperationalPosOrder): PosOperationalChange {
  return {
    resourceType: 'POS_ORDER',
    resourceId: order.id,
    operation: 'UPSERT',
    updatedAt: order.updatedAt,
    data: order
  };
}
