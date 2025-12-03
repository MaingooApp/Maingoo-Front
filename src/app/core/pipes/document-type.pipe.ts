import { Pipe, PipeTransform } from '@angular/core';
import { DocumentType } from '../enums/documents.enum';

@Pipe({
  name: 'documentType',
  standalone: true
})
export class DocumentTypePipe implements PipeTransform {
  transform(value: DocumentType, ...args: unknown[]): string {
    switch (value) {
      case DocumentType.INVOICE:
        return 'Factura';
      case DocumentType.DELIVERY_NOTE:
        return 'Albarán';
      default:
        return value;
    }
  }
}
