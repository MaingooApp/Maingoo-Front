import { Column } from '../../../shared/interfaces/columns.interface';

export const COLUMNS: Column[] = [
  { field: 'invoiceNumber', header: 'Número', type: 'text', filter: true },
  { field: 'supplier.name', header: 'Proveedor', type: 'text', filter: true },
  { field: 'date', header: 'Fecha emisión', type: 'date', filter: true },
  { field: 'amount', header: 'Total con IVA', type: 'numeric', filter: true }
];
