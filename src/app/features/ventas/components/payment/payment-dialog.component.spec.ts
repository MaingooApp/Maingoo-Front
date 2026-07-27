import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CashSession, OperationalPosOrder } from '../../models/pos.models';
import { PaymentDialogComponent } from './payment-dialog.component';

describe('PaymentDialogComponent', () => {
  let fixture: ComponentFixture<PaymentDialogComponent>;
  let component: PaymentDialogComponent;

  beforeEach(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [PaymentDialogComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations()]
    });
    fixture = TestBed.createComponent(PaymentDialogComponent);
    component = fixture.componentInstance;
    component.order = createOrder();
    component.cashSession = createCashSession();
    component.canOpenCash = true;
    component.balance = '8.50';
    fixture.detectChanges();
  });

  it('emits one valid payment and blocks a second submit while pending', () => {
    const emitted: unknown[] = [];
    component.addPayment.subscribe((payment) => emitted.push(payment));
    component.method = 'CARD';
    component.amount = '8.50';
    component.externalReference = '  terminal-42  ';
    const form = jasmine.createSpyObj('NgForm', [], {
      invalid: false,
      control: jasmine.createSpyObj('control', ['markAllAsTouched'])
    });

    component.submitPayment(form);
    component.submitPayment(form);

    expect(emitted).toEqual([{ method: 'CARD', amount: '8.50', externalReference: 'terminal-42' }]);
  });

  it('rejects zero and malformed money values', () => {
    const emit = spyOn(component.addPayment, 'emit');
    const control = jasmine.createSpyObj('control', ['markAllAsTouched']);
    const form = jasmine.createSpyObj('NgForm', [], { invalid: false, control });

    for (const amount of ['0.00', '-1.00', '1.001', '1,00']) {
      component.amount = amount;
      component.submitPayment(form);
    }

    expect(emit).not.toHaveBeenCalled();
    expect(control.markAllAsTouched).toHaveBeenCalledTimes(4);
  });

  it('opens cash before accepting payments and only finalizes an exactly paid order', () => {
    const openCash = spyOn(component.openCash, 'emit');
    const finalize = spyOn(component.finalize, 'emit');
    const form = jasmine.createSpyObj('NgForm', [], {
      invalid: false,
      control: jasmine.createSpyObj('control', ['markAllAsTouched'])
    });
    component.cashSession = null;
    component.openingAmount = '0.00';

    (window.confirm as jasmine.Spy).and.returnValue(false);
    component.submitOpenCash(form);
    expect(openCash).not.toHaveBeenCalled();

    (window.confirm as jasmine.Spy).and.returnValue(true);
    component.submitOpenCash(form);
    expect(openCash).toHaveBeenCalledOnceWith({ openingAmount: '0.00' });

    component.submitting = false;
    component.balance = '0.01';
    component.submitFinalize();
    expect(finalize).not.toHaveBeenCalled();

    component.balance = '0.00';
    component.submitFinalize();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it('calculates cash change exactly and sends the received amount', () => {
    const emit = spyOn(component.addPayment, 'emit');
    const form = jasmine.createSpyObj('NgForm', [], {
      invalid: false,
      control: jasmine.createSpyObj('control', ['markAllAsTouched'])
    });
    component.method = 'CASH';
    component.amount = '20.00';
    component.balance = '8.50';

    expect(component.cashChange).toBe('11.50');

    component.submitPayment(form);

    expect(emit).toHaveBeenCalledOnceWith({ method: 'CASH', amount: '20.00' });
  });

  it('does not render cash-opening controls without pos.cash permission', () => {
    component.cashSession = null;
    component.canOpenCash = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#payment-opening-amount')).toBeNull();
  });

  it('blocks cash, payment and finalization until the server is reachable and synchronized', () => {
    const openCash = spyOn(component.openCash, 'emit');
    const payment = spyOn(component.addPayment, 'emit');
    const finalize = spyOn(component.finalize, 'emit');
    const form = jasmine.createSpyObj('NgForm', [], {
      invalid: false,
      control: jasmine.createSpyObj('control', ['markAllAsTouched'])
    });
    component.blockedReason = 'OFFLINE';
    component.amount = '8.50';
    component.balance = '0.00';

    component.submitOpenCash(form);
    component.submitPayment(form);
    component.submitFinalize();

    expect(openCash).not.toHaveBeenCalled();
    expect(payment).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
    expect(component.canFinalize).toBeFalse();
  });
});

function createOrder(): OperationalPosOrder {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id: 'order-1',
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    tableId: null,
    orderDate: timestamp,
    orderNumber: 42,
    channel: 'TAKEAWAY',
    status: 'PARTIALLY_PAID',
    guestCount: null,
    note: null,
    version: 2,
    subtotalGross: '10.00',
    discountGross: '0.00',
    taxGross: '0.91',
    totalGross: '10.00',
    paidGross: '1.50',
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

function createCashSession(): CashSession {
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
    idempotencyKey: 'key-1',
    openedByUserId: 'user-1',
    closedByUserId: null,
    openedAt: timestamp,
    closedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
