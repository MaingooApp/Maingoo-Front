import { DocumentType } from '../enums/documents.enum';

export interface DocumentTypeConfig {
  label: string;
  value: DocumentType;
}

export const documentTypes: Record<DocumentType, DocumentTypeConfig> = {
  [DocumentType.INVOICE]: {
    label: 'Factura',
    value: DocumentType.INVOICE
  },
  [DocumentType.ALBARAN]: {
    label: 'Albarán',
    value: DocumentType.ALBARAN
  }
};
