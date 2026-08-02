export type DecimalString = string;
export type IsoDateString = string;

export type PosOrderStatus = 'DRAFT' | 'OPEN' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type PosOrderChannel = 'DINE_IN' | 'TAKEAWAY';
export type PosOrderLineStatus = 'OPEN' | 'SENT' | 'VOIDED';
export type PosCostStatus = 'PENDING' | 'CALCULATED' | 'INCOMPLETE' | 'FAILED';
export type KitchenTicketStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'OTHER';
export type PaymentStatus = 'RECORDED' | 'VOIDED';
export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'OPENING' | 'SALE' | 'REFUND' | 'PAY_IN' | 'PAY_OUT' | 'ADJUSTMENT';
export type RefundStatus = 'RECORDED' | 'CANCELLED';
export type FiscalMode = 'DISABLED' | 'SANDBOX' | 'VERIFACTU_TEST' | 'VERIFACTU';
export type FiscalDocumentType = 'SIMPLIFIED' | 'FULL' | 'RECTIFYING';
export type FiscalRecordOperation = 'ALTA' | 'ANULACION';
export type FiscalSubmissionStatus =
  | 'NOT_APPLICABLE'
  | 'PENDING'
  | 'SENT'
  | 'ACCEPTED'
  | 'ACCEPTED_WITH_WARNINGS'
  | 'REJECTED'
  | 'RETRY';
export type PosDeviceType = 'REGISTER' | 'KDS' | 'BACKOFFICE';
export type PosDeviceStatus = 'ACTIVE' | 'REVOKED';
export type StockSyncJobStatus = 'PREPARED' | 'PENDING' | 'PROCESSING' | 'APPLIED' | 'FAILED';
export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'CONFLICT' | 'ERROR';

export interface PosSettings {
  id: string;
  enterpriseId: string;
  enabled: boolean;
  currency: string;
  timezone: string;
  pricesIncludeTax: boolean;
  allowNegativeStock: boolean;
  receiptFooter: string | null;
  fiscalMode: FiscalMode;
  issuerLegalName: string | null;
  issuerTaxId: string | null;
  issuerAddress: string | null;
  fiscalSeriesPrefix: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface PosDevice {
  id: string;
  enterpriseId: string;
  name: string;
  code: string;
  type: PosDeviceType;
  status: PosDeviceStatus;
  lastSeenAt: IsoDateString | null;
  appVersion: string | null;
  createdByUserId: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CashRegister {
  id: string;
  enterpriseId: string;
  name: string;
  code: string;
  active: boolean;
  createdByUserId: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface DiningArea {
  id: string;
  enterpriseId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface DiningTable {
  id: string;
  enterpriseId: string;
  areaId: string;
  name: string;
  capacity: number;
  sortOrder: number;
  active: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface KitchenStation {
  id: string;
  enterpriseId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface MenuCategory {
  id: string;
  enterpriseId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ModifierOption {
  id: string;
  enterpriseId: string;
  groupId: string;
  name: string;
  priceDeltaGross: DecimalString;
  active: boolean;
  sortOrder: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ModifierGroup {
  id: string;
  enterpriseId: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  options: ModifierOption[];
}

export interface MenuItemModifierGroup extends ModifierGroup {
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  enterpriseId: string;
  categoryId: string;
  name: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  foodPreparationId: string | null;
  priceGross: DecimalString;
  taxRate: DecimalString;
  trackStock: boolean;
  kitchenStationId: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  modifierGroups: MenuItemModifierGroup[];
}

export interface PosOrderLineModifier {
  id: string;
  enterpriseId: string;
  orderLineId: string;
  name: string;
  priceDeltaGross: DecimalString;
  quantity: DecimalString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface PosOrderLine {
  id: string;
  enterpriseId: string;
  orderId: string;
  menuItemId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  itemName: string;
  sku: string | null;
  foodPreparationId: string | null;
  unitPriceGross: DecimalString;
  taxRate: DecimalString;
  quantity: DecimalString;
  discountGross: DecimalString;
  lineTotalGross: DecimalString;
  trackStock: boolean;
  estimatedCostNet: DecimalString | null;
  costStatus: PosCostStatus;
  note: string | null;
  status: PosOrderLineStatus;
  voidReason: string | null;
  voidedByUserId: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  modifiers: PosOrderLineModifier[];
  menuItem: {
    kitchenStationId: string | null;
    kitchenStation: { active: boolean } | null;
  } | null;
}

export interface KitchenTicketItem {
  id: string;
  enterpriseId: string;
  kitchenTicketId: string;
  orderLineId: string;
  itemName: string;
  quantity: DecimalString;
  note: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface KitchenTicketItemModifier {
  id: string;
  name: string;
  quantity: DecimalString;
}

export interface KitchenTicket {
  id: string;
  enterpriseId: string;
  orderId: string;
  stationId: string;
  sequence: number;
  status: KitchenTicketStatus;
  sentAt: IsoDateString;
  startedAt: IsoDateString | null;
  readyAt: IsoDateString | null;
  servedAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  station: KitchenStation;
  items: KitchenTicketItem[];
}

export interface KitchenTicketListItem extends KitchenTicket {
  items: Array<KitchenTicketItem & { modifiers: KitchenTicketItemModifier[] }>;
  order: {
    id: string;
    orderNumber: number;
    tableId: string | null;
    channel: PosOrderChannel;
    table: { id: string; name: string } | null;
  };
}

export interface KitchenTicketUpdateResponse extends KitchenTicket {
  items: Array<KitchenTicketItem & { modifiers: KitchenTicketItemModifier[] }>;
  order: {
    id: string;
    orderNumber: number;
    tableId: string | null;
    channel: PosOrderChannel;
    table: { id: string; name: string } | null;
  };
}

export interface CashMovement {
  id: string;
  enterpriseId: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: DecimalString;
  paymentId: string | null;
  idempotencyKey: string;
  reason: string | null;
  createdByUserId: string;
  createdAt: IsoDateString;
}

export interface CashSession {
  id: string;
  enterpriseId: string;
  cashRegisterId: string;
  status: CashSessionStatus;
  openingAmount: DecimalString;
  expectedCash: DecimalString;
  countedCash: DecimalString | null;
  difference: DecimalString | null;
  idempotencyKey: string;
  openedByUserId: string;
  closedByUserId: string | null;
  openedAt: IsoDateString;
  closedAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CashSessionWithMovements extends CashSession {
  cashMovements: CashMovement[];
}

export interface Payment {
  id: string;
  enterpriseId: string;
  orderId: string;
  cashSessionId: string | null;
  method: PaymentMethod;
  amount: DecimalString;
  tenderedAmount: DecimalString;
  changeGross: DecimalString;
  status: PaymentStatus;
  idempotencyKey: string;
  externalReference: string | null;
  createdByUserId: string;
  createdAt: IsoDateString;
  voidedAt: IsoDateString | null;
  voidedByUserId: string | null;
  voidReason: string | null;
  updatedAt: IsoDateString;
}

export interface Refund {
  id: string;
  enterpriseId: string;
  orderId: string;
  paymentId: string | null;
  amount: DecimalString;
  reason: string;
  status: RefundStatus;
  idempotencyKey: string;
  createdByUserId: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  cancelledAt: IsoDateString | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  fiscalDocumentId: string | null;
}

export interface FiscalDocument {
  id: string;
  enterpriseId: string;
  orderId: string;
  seriesId: string;
  type: FiscalDocumentType;
  series: string;
  number: number;
  issuedAt: IsoDateString;
  issuerLegalName: string;
  issuerTaxId: string;
  issuerFiscalAddress: string;
  customerLegalName: string | null;
  customerTaxId: string | null;
  customerFiscalAddress: string | null;
  taxBase: DecimalString;
  taxGross: DecimalString;
  totalGross: DecimalString;
  taxBreakdown: unknown;
  rectifiesDocumentId: string | null;
  qrPayload: string;
  createdAt: IsoDateString;
}

export interface PosOrder {
  id: string;
  enterpriseId: string;
  deviceId: string;
  tableId: string | null;
  orderDate: IsoDateString;
  orderNumber: number;
  channel: PosOrderChannel;
  status: PosOrderStatus;
  guestCount: number | null;
  note: string | null;
  version: number;
  subtotalGross: DecimalString;
  discountGross: DecimalString;
  taxGross: DecimalString;
  totalGross: DecimalString;
  paidGross: DecimalString;
  costNet: DecimalString | null;
  costStatus: PosCostStatus;
  openedByUserId: string;
  closedByUserId: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  openedAt: IsoDateString;
  closedAt: IsoDateString | null;
  cancelledAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  lines: PosOrderLine[];
  kitchenTickets: KitchenTicket[];
  payments: Payment[];
  refunds: Refund[];
  fiscalDocuments: FiscalDocument[];
}

export interface FiscalRecordSummary {
  id: string;
  operation: FiscalRecordOperation;
  reason: string | null;
  previousRecordId: string | null;
  recordHash: string;
  recordedAt: IsoDateString;
  submissionStatus: FiscalSubmissionStatus;
  externalReference: string | null;
  attempts: number;
  retryAttempts: number;
  nextAttemptAt: IsoDateString;
  lastAttemptAt: IsoDateString | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface FiscalDocumentSummary {
  id: string;
  orderId: string;
  type: FiscalDocumentType;
  series: string;
  number: number;
  issuedAt: IsoDateString;
  totalGross: DecimalString;
  taxGross: DecimalString;
  rectifiesDocumentId: string | null;
  submissionStatus: FiscalSubmissionStatus | null;
  externalReference: string | null;
  records: FiscalRecordSummary[];
}

export interface FiscalReceipt extends FiscalDocument {
  label: string;
  documentNumber: string;
  records: FiscalRecordSummary[];
}

export interface OrderStockSyncJobSummary {
  id: string;
  status: StockSyncJobStatus;
  attempts: number;
  nextAttemptAt: IsoDateString;
  lastErrorCode: string | null;
  lastWarningCode: string | null;
  appliedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface OperationalStockSyncJob extends OrderStockSyncJobSummary {
  orderId: string;
  createdAt: IsoDateString;
}

export type BootstrapChange =
  | PosChange<'POS_SETTINGS', PosSettings>
  | PosChange<'POS_DEVICE', PosDevice>
  | PosChange<'DINING_AREA', DiningArea>
  | PosChange<'DINING_TABLE', DiningTable>
  | PosChange<'KITCHEN_STATION', KitchenStation>
  | PosChange<'MENU_CATEGORY', MenuCategory>
  | PosChange<'MODIFIER_GROUP', ModifierGroup>
  | PosChange<'MENU_ITEM', MenuItem>
  | PosChange<'CASH_SESSION', CashSessionWithMovements>;

export interface PosBootstrapResponse {
  settings: PosSettings;
  device: PosDevice | null;
  areas: DiningArea[];
  tables: DiningTable[];
  kitchenStations: KitchenStation[];
  menuCategories: MenuCategory[];
  modifierGroups: ModifierGroup[];
  menuItems: MenuItem[];
  cashSession: CashSessionWithMovements | null;
  changes: BootstrapChange[];
  cursor: IsoDateString;
}

export interface OperationalPosOrder extends Omit<PosOrder, 'lines' | 'kitchenTickets' | 'fiscalDocuments'> {
  lines: Array<Omit<PosOrderLine, 'menuItem'>>;
  kitchenTickets: Array<Omit<KitchenTicket, 'station'>>;
  fiscalDocuments: Array<
    Pick<
      FiscalDocument,
      | 'id'
      | 'type'
      | 'series'
      | 'number'
      | 'issuedAt'
      | 'taxBase'
      | 'taxGross'
      | 'totalGross'
      | 'taxBreakdown'
      | 'rectifiesDocumentId'
      | 'qrPayload'
    >
  >;
  stockSyncJob: OrderStockSyncJobSummary | null;
}

export interface OperationalKitchenTicket extends KitchenTicket {
  order: {
    id: string;
    orderNumber: number;
    deviceId: string;
  };
}

export type PosOperationalChange =
  | PosChange<'POS_ORDER', OperationalPosOrder>
  | PosChange<'KITCHEN_TICKET', OperationalKitchenTicket>
  | PosChange<'CASH_SESSION', CashSession>
  | PosChange<'CASH_MOVEMENT', CashMovement>
  | PosChange<'STOCK_SYNC_JOB', OperationalStockSyncJob>;

export interface PosOperationalSyncResponse {
  changes: PosOperationalChange[];
  serverCursor: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  nextPage: number | null;
}

export interface CursorPage<T> {
  items: T[];
  limit: number;
  nextCursor: string | null;
}

export interface DailySalesSummary {
  date: string;
  currency: string;
  grossSales: DecimalString;
  grossSalesBeforeDiscounts: DecimalString;
  salesAfterDiscountsGross: DecimalString;
  taxGross: DecimalString;
  refundTaxGross: DecimalString;
  netTaxGross: DecimalString;
  discountGross: DecimalString;
  refundsGross: DecimalString;
  salesNet: DecimalString;
  refundsNet: DecimalString;
  netSales: DecimalString;
  netSalesGross: DecimalString;
  theoreticalCostNet: DecimalString;
  netMargin: DecimalString;
  marginAmount: DecimalString;
  marginStatus: 'CALCULATED' | 'INCOMPLETE';
  incompleteCostOrderCount: number;
  orderCount: number;
  guestCount: number;
  paymentsByMethod: Record<PaymentMethod, DecimalString>;
  accountingBasis: {
    sales: 'VAT_EXCLUDED_AFTER_REFUNDS';
    cost: 'HISTORICAL_RECIPE_COST_NET';
    margin: 'NET_SALES_MINUS_THEORETICAL_COST_NET';
  };
  timestampBasis: {
    sales: 'FISCAL_ISSUED_AT_FALLBACK_ORDER_CLOSED_AT';
    refunds: 'REFUND_CREATED_AT';
    cashDeviation: 'CASH_SESSION_CLOSED_AT';
  };
  cashSessions: DailyCashSessionSummary[];
}

export interface DailyCashSessionSummary {
  id: string;
  deviceId: string;
  status: CashSessionStatus;
  openingAmount: DecimalString;
  expectedCash: DecimalString;
  countedCash: DecimalString | null;
  difference: DecimalString | null;
  openedAt: IsoDateString;
  closedAt: IsoDateString | null;
}

export type SalesReportCostStatus = 'CALCULATED' | 'INCOMPLETE';

export interface SalesReportAccountingBasis {
  sales: 'VAT_EXCLUDED';
  cost: 'HISTORICAL_RECIPE_COST_NET';
  margin: 'NET_SALES_MINUS_THEORETICAL_COST_NET';
}

export interface SalesBreakdownItem {
  id: string | null;
  name: string;
  quantity: DecimalString;
  lineCount: number;
  grossSalesBeforeDiscounts: DecimalString;
  discountGross: DecimalString;
  salesAfterDiscountsGross: DecimalString;
  salesNet: DecimalString;
  theoreticalCostNet: DecimalString;
  netMargin: DecimalString;
  costStatus: SalesReportCostStatus;
  incompleteCostLineCount: number;
}

export interface SalesBreakdownReport {
  date: string;
  currency: string;
  items: SalesBreakdownItem[];
  accountingBasis: SalesReportAccountingBasis;
}

export interface SalesByHourItem {
  hour: number;
  label: string;
  orderCount: number;
  grossSalesBeforeDiscounts: DecimalString;
  discountGross: DecimalString;
  salesAfterDiscountsGross: DecimalString;
  salesNet: DecimalString;
  theoreticalCostNet: DecimalString;
  netMargin: DecimalString;
  costStatus: SalesReportCostStatus;
  incompleteCostOrderCount: number;
}

export interface SalesByHourReport {
  date: string;
  currency: string;
  items: SalesByHourItem[];
  accountingBasis: SalesReportAccountingBasis;
}

export interface SalesByPaymentMethodItem {
  method: PaymentMethod | 'UNALLOCATED';
  paymentCount: number;
  refundCount: number;
  paymentGross: DecimalString;
  refundGross: DecimalString;
  netCollectedGross: DecimalString;
}

export interface SalesByPaymentMethodReport {
  date: string;
  currency: string;
  items: SalesByPaymentMethodItem[];
}

export type CashDeviationCode = 'CASH_BALANCED' | 'CASH_OVER' | 'CASH_SHORT';

export interface CashDeviationItem {
  id: string;
  deviceId: string;
  expectedCash: DecimalString;
  countedCash: DecimalString | null;
  difference: DecimalString;
  openedAt: IsoDateString;
  closedAt: IsoDateString | null;
  deviationCode: CashDeviationCode;
}

export interface CashDeviationReport {
  date: string;
  currency: string;
  sessionCount: number;
  totalDifference: DecimalString;
  items: CashDeviationItem[];
}

export interface IncompleteCostItem {
  orderLineId: string;
  menuItemId: string | null;
  itemName: string;
  sku: string | null;
  costStatus: PosCostStatus;
  estimatedCostNet: DecimalString | null;
  salesAfterDiscountsGross: DecimalString;
  issueCodes: string[];
}

export interface IncompleteCostsReport {
  date: string;
  currency: string;
  itemCount: number;
  items: IncompleteCostItem[];
  accountingBasis: SalesReportAccountingBasis;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  code?: string;
  details?: unknown;
  currentOrder?: PosOrder;
}

interface PosChange<TResource extends string, TData> {
  resourceType: TResource;
  resourceId: string;
  operation: 'UPSERT';
  updatedAt: IsoDateString;
  data: TData;
}
