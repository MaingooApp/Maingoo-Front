import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReceiptPrintService {
  print(): void {
    window.print();
  }
}
