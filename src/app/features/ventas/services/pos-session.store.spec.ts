import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OperationalPosOrder, PosBootstrapResponse, PosOperationalChange } from '../models/pos.models';
import { PosSessionStore } from './pos-session.store';
import { PosService } from './pos.service';

describe('PosSessionStore', () => {
  let store: PosSessionStore;
  let posService: jasmine.SpyObj<PosService>;

  beforeEach(() => {
    posService = jasmine.createSpyObj<PosService>('PosService', ['getBootstrap', 'getSync']);
    TestBed.configureTestingModule({
      providers: [PosSessionStore, { provide: PosService, useValue: posService }]
    });
    store = TestBed.inject(PosSessionStore);
  });

  it('hydrates bootstrap and drains every operational sync page', async () => {
    const firstPageChanges = Array.from({ length: 200 }, (_, index) =>
      orderChange(createOrder(`order-${index}`, '10.00', '0.00'))
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
        changes: [orderChange(createOrder('order-1', '0.30', '0.10'))],
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
});

function createBootstrap(): PosBootstrapResponse {
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
    cashSession: null,
    changes: [],
    cursor: timestamp
  };
}

function createOrder(id: string, totalGross: string, paidGross: string): OperationalPosOrder {
  const timestamp = '2026-07-25T10:00:00.000Z';
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
    fiscalDocuments: [],
    stockSyncJob: null
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
