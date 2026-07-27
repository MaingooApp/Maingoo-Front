import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { FiscalReceipt, OperationalPosOrder } from '../../models/pos.models';
import { PosService } from '../../services/pos.service';
import { ReceiptPrintService } from '../../services/receipt-print.service';
import { ReceiptViewComponent } from './receipt-view.component';

describe('ReceiptViewComponent', () => {
  it('prints only after the explicit user action', () => {
    const printer = jasmine.createSpyObj<ReceiptPrintService>('ReceiptPrintService', ['print']);
    const posService = jasmine.createSpyObj<PosService>('PosService', ['getReceipt']);
    TestBed.configureTestingModule({
      imports: [ReceiptViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: ReceiptPrintService, useValue: printer }
      ]
    });
    const fixture = TestBed.createComponent(ReceiptViewComponent);
    fixture.componentInstance.order = createOrder();
    fixture.detectChanges();

    expect(printer.print).not.toHaveBeenCalled();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.receipt-print');
    button.click();

    expect(printer.print).toHaveBeenCalledTimes(1);
  });

  it('resolves an operational summary and renders the authoritative fiscal receipt with a QR', async () => {
    const printer = jasmine.createSpyObj<ReceiptPrintService>('ReceiptPrintService', ['print']);
    const posService = jasmine.createSpyObj<PosService>('PosService', ['getReceipt']);
    posService.getReceipt.and.returnValue(of(createFiscalReceipt()));
    TestBed.configureTestingModule({
      imports: [ReceiptViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: ReceiptPrintService, useValue: printer }
      ]
    });
    const fixture = TestBed.createComponent(ReceiptViewComponent);
    const order = createOrder();
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('fiscalDocument', createFiscalSummary());
    fixture.componentRef.setInput('canReadFiscal', true);
    fixture.componentRef.setInput('fiscalStatus', 'ACCEPTED');
    fixture.componentRef.setInput('stockSyncStatus', 'APPLIED');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(posService.getReceipt).toHaveBeenCalledOnceWith('fiscal-1', 'enterprise-1');
    const receiptText = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
    expect(receiptText).toContain('DOCUMENTO FISCAL');
    expect(receiptText).toContain('MG/42');
    expect(receiptText).toContain('Maingoo Demo SL');
    expect(receiptText).toContain('B12345678');
    expect(receiptText).toContain('8.26');
    expect(receiptText).toContain('ACCEPTED');
    expect(receiptText).toContain('APPLIED');

    const qr: HTMLImageElement | null = fixture.nativeElement.querySelector('.receipt-qr');
    expect(qr).not.toBeNull();
    expect(qr?.src).toContain('data:image/png;base64,');
    expect(qr?.alt).toBeTruthy();
  });

  it('keeps the operational summary without requesting protected fiscal detail by default', () => {
    const printer = jasmine.createSpyObj<ReceiptPrintService>('ReceiptPrintService', ['print']);
    const posService = jasmine.createSpyObj<PosService>('PosService', ['getReceipt']);
    TestBed.configureTestingModule({
      imports: [ReceiptViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: ReceiptPrintService, useValue: printer }
      ]
    });
    const fixture = TestBed.createComponent(ReceiptViewComponent);
    fixture.componentRef.setInput('order', createOrder());
    fixture.componentRef.setInput('fiscalDocument', createFiscalSummary());
    fixture.detectChanges();

    expect(posService.getReceipt).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('MG/42');
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
    status: 'PAID',
    guestCount: null,
    note: null,
    version: 3,
    subtotalGross: '10.00',
    discountGross: '0.00',
    taxGross: '0.91',
    totalGross: '10.00',
    paidGross: '10.00',
    costNet: null,
    costStatus: 'PENDING',
    openedByUserId: 'user-1',
    closedByUserId: 'user-1',
    cancelledByUserId: null,
    cancellationReason: null,
    openedAt: timestamp,
    closedAt: timestamp,
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

function createFiscalReceipt(): FiscalReceipt {
  const timestamp = '2026-07-25T10:00:00.000Z';
  return {
    id: 'fiscal-1',
    enterpriseId: 'enterprise-1',
    orderId: 'order-1',
    seriesId: 'series-1',
    type: 'SIMPLIFIED',
    series: 'MG',
    number: 42,
    issuedAt: timestamp,
    issuerLegalName: 'Maingoo Demo SL',
    issuerTaxId: 'B12345678',
    issuerFiscalAddress: 'Calle Mayor 1, Madrid',
    customerLegalName: null,
    customerTaxId: null,
    customerFiscalAddress: null,
    taxBase: '8.26',
    taxGross: '1.74',
    totalGross: '10.00',
    taxBreakdown: [{ rate: '21.00', base: '8.26', tax: '1.74', total: '10.00' }],
    rectifiesDocumentId: null,
    qrPayload: 'https://example.test/qr?invoice=MG%2F42',
    createdAt: timestamp,
    label: 'DOCUMENTO FISCAL',
    documentNumber: 'MG/42',
    records: [
      {
        id: 'record-1',
        operation: 'ALTA',
        reason: null,
        previousRecordId: null,
        recordHash: 'hash',
        recordedAt: timestamp,
        submissionStatus: 'ACCEPTED',
        externalReference: 'AEAT-1',
        attempts: 1,
        retryAttempts: 0,
        nextAttemptAt: timestamp,
        lastAttemptAt: timestamp,
        lastErrorCode: null,
        lastErrorMessage: null
      }
    ]
  };
}

function createFiscalSummary(): OperationalPosOrder['fiscalDocuments'][number] {
  return {
    id: 'fiscal-1',
    type: 'SIMPLIFIED',
    series: 'MG',
    number: 42,
    issuedAt: '2026-07-25T10:00:00.000Z',
    taxBase: '8.26',
    taxGross: '1.74',
    totalGross: '10.00',
    taxBreakdown: [{ rate: '21.00', base: '8.26', tax: '1.74', total: '10.00' }],
    rectifiesDocumentId: null,
    qrPayload: 'https://example.test/qr?invoice=MG%2F42'
  };
}
