import { TestBed } from '@angular/core/testing';

import { ReceiptPrintService } from './receipt-print.service';

describe('ReceiptPrintService', () => {
  it('delegates printing to the browser', () => {
    const print = spyOn(window, 'print');

    TestBed.inject(ReceiptPrintService).print();

    expect(print).toHaveBeenCalledTimes(1);
  });
});
