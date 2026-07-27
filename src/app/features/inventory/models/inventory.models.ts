import { DecimalString, IsoDateString } from '../../ventas/models/pos.models';

export type StockBaseUnit = 'g' | 'ml' | 'ud';
export type StockMovementType =
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'WASTE'
  | 'COUNT_ADJUSTMENT'
  | 'MANUAL_ADJUSTMENT'
  | 'PURCHASE_REVERSAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';
export type StockCountStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

export interface InventorySummaryItem {
  enterpriseProductId: string;
  productBaseId: string;
  name: string;
  stockBaseQuantity: DecimalString;
  stockBaseUnit: StockBaseUnit;
  minimumStockBase: DecimalString | null;
  stockUpdatedAt: IsoDateString | null;
  isLowStock: boolean;
  needsManualReview: boolean;
  stockValue: DecimalString | null;
}

export interface InventorySummaryResponse {
  items: InventorySummaryItem[];
  totals: {
    products: number;
    lowStock: number;
    needsManualReview: number;
  };
}

export interface StockMovement {
  id: string;
  enterpriseId: string;
  enterpriseProductId: string;
  productName?: string;
  type: StockMovementType;
  quantityBase: DecimalString;
  balanceAfterBase: DecimalString;
  baseUnit: StockBaseUnit;
  unitCost: DecimalString | null;
  totalCost: DecimalString | null;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  reasonCode: string | null;
  note: string | null;
  createdByUserId: string | null;
  createdAt: IsoDateString;
}

export interface StockMovementsResponse {
  items: Array<StockMovement & { productName: string }>;
  total: number;
  page: number;
  limit: number;
}

export interface ApplyInventoryMovementCommand {
  enterpriseId?: string;
  enterpriseProductId: string;
  type: 'WASTE' | 'MANUAL_ADJUSTMENT';
  quantityBase: DecimalString;
  baseUnit: StockBaseUnit;
  idempotencyKey: string;
  reasonCode: string;
  note?: string;
}

export interface StockCountLine {
  id: string;
  enterpriseProductId: string;
  expectedBaseQuantity: DecimalString;
  countedBaseQuantity: DecimalString | null;
  differenceBaseQuantity: DecimalString | null;
  baseUnit: StockBaseUnit;
}

export interface StockCount {
  id: string;
  enterpriseId: string;
  status: StockCountStatus;
  startedByUserId: string;
  completedByUserId: string | null;
  note: string | null;
  startedAt: IsoDateString;
  completedAt: IsoDateString | null;
  lines: StockCountLine[];
}

export interface CreateStockCountCommand {
  enterpriseId?: string;
  note?: string;
  enterpriseProductIds?: string[];
}

export interface CompleteStockCountCommand {
  enterpriseId?: string;
  lines: Array<{
    enterpriseProductId: string;
    countedBaseQuantity: DecimalString;
  }>;
}

export interface CompleteStockCountResponse extends StockCount {
  movements: StockMovement[];
  replayed: boolean;
}

export interface InventorySummaryFilters {
  enterpriseId?: string;
  lowStockOnly?: boolean;
  includeInactive?: boolean;
  search?: string;
}

export interface StockMovementFilters {
  enterpriseId?: string;
  enterpriseProductId?: string;
  type?: StockMovementType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
