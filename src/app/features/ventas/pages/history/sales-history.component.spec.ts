import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { Subject, of } from 'rxjs';

import { AppPermission } from '@core/constants/permissions.enum';

import { PosOrder, PosSettings, Refund } from '../../models/pos.models';
import { PosService } from '../../services/pos.service';
import { SalesHistoryComponent } from './sales-history.component';

describe('SalesHistoryComponent', () => {
  let fixture: ComponentFixture<SalesHistoryComponent>;
  let component: SalesHistoryComponent;
  let posService: jasmine.SpyObj<PosService>;
  let confirmation: jasmine.SpyObj<ConfirmationService>;
  let grantedPermissions: Set<string>;

  beforeEach(() => {
    localStorage.clear();
    grantedPermissions = new Set([AppPermission.PosRead, AppPermission.PosRefund, AppPermission.FiscalRead]);
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'listOrders',
      'getOrder',
      'getReceipt',
      'createRefund',
      'getCurrentCashSession',
      'listTables',
      'listDevices',
      'getSettings'
    ]);
    posService.listOrders.and.returnValue(of({ items: [order()], page: 1, limit: 20, nextPage: 2 }));
    posService.listTables.and.returnValue(of([]));
    posService.listDevices.and.returnValue(of([registerDevice()]));
    posService.getSettings.and.returnValue(of(settings()));
    confirmation = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    confirmation.confirm.and.callFake((config: Confirmation) => config.accept?.());

    TestBed.configureTestingModule({
      imports: [SalesHistoryComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: ConfirmationService, useValue: confirmation },
        {
          provide: NgxPermissionsService,
          useValue: { getPermission: (permission: string) => (grantedPermissions.has(permission) ? {} : undefined) }
        }
      ]
    });
  });

  afterEach(() => localStorage.clear());

  it('sends only supported filters and keeps pagination on the server', () => {
    createComponent();
    component.status = 'PAID';
    component.channel = 'DINE_IN';
    component.tableId = '11111111-1111-4111-8111-111111111111';
    component.deviceId = '22222222-2222-4222-8222-222222222222';
    component.from = '2026-07-01';
    component.to = '2026-07-31';

    component.applyFilters();

    expect(posService.listOrders).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'PAID',
        channel: 'DINE_IN',
        tableId: component.tableId,
        deviceId: component.deviceId,
        from: jasmine.any(String),
        to: jasmine.any(String),
        page: 1,
        limit: 20
      })
    );
    const filteredRequest = posService.listOrders.calls.mostRecent().args[0];
    const filteredFrom = filteredRequest?.from ?? '';
    const filteredTo = filteredRequest?.to ?? '';
    expect(new Date(filteredFrom).toISOString()).toBe(filteredFrom);
    expect(new Date(filteredTo).toISOString()).toBe(filteredTo);

    component.nextPage();

    const nextPageFilters = posService.listOrders.calls.mostRecent().args[0];
    expect(nextPageFilters?.page).toBe(2);
    expect(nextPageFilters).not.toEqual(
      jasmine.objectContaining({ orderNumber: jasmine.anything(), paymentMethod: jasmine.anything() })
    );
  });

  it('validates refundable cents, reuses the complete retry and refetches the authoritative order', () => {
    const current = order();
    const updated = order({ version: 8, refunds: [...current.refunds, refund('refund-2', '50.25')] });
    const refundResponse = new Subject<Refund>();
    posService.createRefund.and.returnValue(refundResponse);
    posService.getOrder.and.returnValue(of(updated));
    localStorage.setItem('maingoo-pos-device-id', current.deviceId);
    createComponent();
    component.orders.set([current]);
    component.selectedOrder.set(current);
    component.openRefund();
    component.refundAmount = '80.01';
    component.refundReason = 'Devolución parcial confirmada';
    expect(component.refundFormValid()).toBeFalse();
    component.refundAmount = '50.25';

    component.confirmRefund();
    component.confirmRefund();

    expect(posService.createRefund).toHaveBeenCalledTimes(1);
    expect(posService.createRefund).toHaveBeenCalledWith(
      current.id,
      jasmine.objectContaining({
        deviceId: current.deviceId,
        expectedVersion: current.version,
        paymentId: 'payment-1',
        amount: '50.25',
        reason: 'Devolución parcial confirmada'
      }),
      jasmine.any(String)
    );
    expect(component.refundSubmitting()).toBeTrue();

    const firstCommand = posService.createRefund.calls.argsFor(0)[1];
    const firstIdempotencyKey = posService.createRefund.calls.argsFor(0)[2];
    refundResponse.error({ code: 'NETWORK_ERROR' });
    posService.createRefund.and.returnValue(of(refund('refund-2', '50.25')));

    component.confirmRefund();

    expect(posService.createRefund).toHaveBeenCalledTimes(2);
    expect(posService.createRefund.calls.argsFor(1)[1]).toEqual(firstCommand);
    expect(posService.createRefund.calls.argsFor(1)[2]).toBe(firstIdempotencyKey);

    expect(posService.getOrder).toHaveBeenCalledOnceWith(current.id);
    expect(component.selectedOrder()?.version).toBe(8);
    expect(component.orders()[0].version).toBe(8);
    expect(component.refundSubmitting()).toBeFalse();
    expect(component.refundSuccess()).toBeTrue();
  });

  it('requires an open cash session and hides refund capability without pos.refund', () => {
    const cashOrder = order({ payments: [{ ...order().payments[0], method: 'CASH' }] });
    localStorage.setItem('maingoo-pos-device-id', cashOrder.deviceId);
    posService.getCurrentCashSession.and.returnValue(of(null));
    createComponent();
    component.selectedOrder.set(cashOrder);
    component.openRefund();
    component.refundReason = 'Salida de caja por devolución';
    component.confirmRefund();

    expect(posService.getCurrentCashSession).toHaveBeenCalledOnceWith(cashOrder.deviceId);
    expect(posService.createRefund).not.toHaveBeenCalled();
    expect(component.refundErrorCode()).toBe('OPEN_CASH_SESSION_NOT_FOUND');

    fixture.destroy();
    TestBed.resetTestingModule();
    grantedPermissions = new Set([AppPermission.PosRead]);
    TestBed.configureTestingModule({
      imports: [SalesHistoryComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: ConfirmationService, useValue: confirmation },
        {
          provide: NgxPermissionsService,
          useValue: { getPermission: (permission: string) => (grantedPermissions.has(permission) ? {} : undefined) }
        }
      ]
    });
    createComponent();
    component.selectedOrder.set(cashOrder);

    expect(component.canRefund).toBeFalse();
    expect(component.canOpenRefund()).toBeFalse();
  });

  it('rejects a stored device that is not an active register', () => {
    const current = order();
    localStorage.setItem('maingoo-pos-device-id', current.deviceId);
    createComponent();
    component.selectedOrder.set(current);
    component.devices.set([{ ...registerDevice(), status: 'REVOKED' }]);

    expect(component.hasActiveDevice()).toBeFalse();
    expect(component.canOpenRefund()).toBeFalse();

    component.devices.set([{ ...registerDevice(), type: 'KDS' }]);
    expect(component.hasActiveDevice()).toBeFalse();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(SalesHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
});

function order(overrides: Partial<PosOrder> = {}): PosOrder {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id: '33333333-3333-4333-8333-333333333333',
    enterpriseId: '44444444-4444-4444-8444-444444444444',
    deviceId: '22222222-2222-4222-8222-222222222222',
    tableId: null,
    orderDate: timestamp,
    orderNumber: 42,
    channel: 'TAKEAWAY',
    status: 'PAID',
    guestCount: null,
    note: null,
    version: 7,
    subtotalGross: '100.00',
    discountGross: '0.00',
    taxGross: '9.09',
    totalGross: '100.00',
    paidGross: '100.00',
    costNet: '35.00',
    costStatus: 'CALCULATED',
    openedByUserId: '55555555-5555-4555-8555-555555555555',
    closedByUserId: '55555555-5555-4555-8555-555555555555',
    cancelledByUserId: null,
    cancellationReason: null,
    openedAt: timestamp,
    closedAt: timestamp,
    cancelledAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lines: [],
    kitchenTickets: [],
    payments: [
      {
        id: 'payment-1',
        enterpriseId: '44444444-4444-4444-8444-444444444444',
        orderId: '33333333-3333-4333-8333-333333333333',
        cashSessionId: null,
        method: 'CARD',
        amount: '100.00',
        tenderedAmount: '100.00',
        changeGross: '0.00',
        status: 'RECORDED',
        idempotencyKey: '66666666-6666-4666-8666-666666666666',
        externalReference: null,
        createdByUserId: '55555555-5555-4555-8555-555555555555',
        createdAt: timestamp,
        voidedAt: null,
        voidedByUserId: null,
        voidReason: null,
        updatedAt: timestamp
      }
    ],
    refunds: [refund('refund-1', '20.00')],
    fiscalDocuments: [],
    ...overrides
  };
}

function refund(id: string, amount: string): Refund {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id,
    enterpriseId: '44444444-4444-4444-8444-444444444444',
    orderId: '33333333-3333-4333-8333-333333333333',
    paymentId: 'payment-1',
    amount,
    reason: 'Devolución registrada',
    status: 'RECORDED',
    idempotencyKey: '77777777-7777-4777-8777-777777777777',
    createdByUserId: '55555555-5555-4555-8555-555555555555',
    createdAt: timestamp,
    updatedAt: timestamp,
    cancelledAt: null,
    cancelledByUserId: null,
    cancellationReason: null,
    fiscalDocumentId: null
  };
}

function settings(): PosSettings {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id: '88888888-8888-4888-8888-888888888888',
    enterpriseId: '44444444-4444-4444-8444-444444444444',
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
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function registerDevice() {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id: '22222222-2222-4222-8222-222222222222',
    enterpriseId: '44444444-4444-4444-8444-444444444444',
    name: 'Caja principal',
    code: 'CAJA-1',
    type: 'REGISTER' as const,
    status: 'ACTIVE' as const,
    lastSeenAt: timestamp,
    appVersion: null,
    createdByUserId: '55555555-5555-4555-8555-555555555555',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
