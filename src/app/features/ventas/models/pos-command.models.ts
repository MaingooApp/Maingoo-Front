import { DecimalString, KitchenTicketStatus, PaymentMethod, PosOrderChannel } from './pos.models';

export type PosCommandType =
  | 'CREATE_ORDER'
  | 'ADD_LINE'
  | 'UPDATE_LINE'
  | 'REMOVE_LINE'
  | 'SEND_ORDER'
  | 'ADD_PAYMENT'
  | 'FINALIZE_ORDER'
  | 'UPDATE_KITCHEN_TICKET';

export type PosCommandStatus = 'PENDING' | 'SENDING' | 'CONFLICT' | 'FAILED';

export interface CreateOrderCommandData extends DeviceCommandData {
  tableId?: string;
  channel: PosOrderChannel;
  guestCount?: number;
  note?: string;
}

export interface AddLineCommandData extends VersionedDeviceCommandData {
  menuItemId: string;
  modifierOptionIds?: string[];
  quantity: DecimalString;
  discountGross?: DecimalString;
  note?: string;
}

export interface UpdateLineCommandData extends VersionedDeviceCommandData {
  quantity?: DecimalString;
  discountGross?: DecimalString;
  note?: string;
}

export type RemoveLineCommandData = VersionedDeviceCommandData;

export interface SendOrderCommandData extends VersionedDeviceCommandData {
  lineIds?: string[];
}

export interface AddPaymentCommandData extends VersionedCashRegisterCommandData {
  cashSessionId?: string;
  method: PaymentMethod;
  amount: DecimalString;
  externalReference?: string;
}

export interface FiscalCustomer {
  legalName: string;
  taxId: string;
  fiscalAddress: string;
}

export interface FinalizeOrderCommandData extends VersionedCashRegisterCommandData {
  fiscalCustomer?: FiscalCustomer;
}

export interface CancelOrderCommandData extends VersionedDeviceCommandData {
  reason: string;
}

export interface VoidLineCommandData extends VersionedDeviceCommandData {
  lineId: string;
  reason: string;
}

export interface VoidPaymentCommandData extends VersionedDeviceCommandData {
  reason: string;
}

export interface CreateRefundCommandData extends VersionedDeviceCommandData {
  paymentId?: string;
  cashSessionId?: string;
  amount: DecimalString;
  reason: string;
}

export interface CancelRefundCommandData extends VersionedDeviceCommandData {
  reason: string;
}

export interface UpdateKitchenTicketCommandData extends DeviceCommandData {
  ticketId: string;
  status: Exclude<KitchenTicketStatus, 'QUEUED'>;
}

export interface OpenCashSessionCommandData extends CashRegisterCommandData {
  openingAmount: DecimalString;
}

export interface CreateCashMovementCommandData extends CashRegisterCommandData {
  type: 'PAY_IN' | 'PAY_OUT' | 'ADJUSTMENT';
  amount: DecimalString;
  reason: string;
}

export interface CloseCashSessionCommandData extends CashRegisterCommandData {
  countedCash: DecimalString;
}

export type QueuedPosCommand =
  | QueuedCreateOrderCommand
  | QueuedLineCommand<'ADD_LINE', AddLineCommandData>
  | QueuedLineCommand<'UPDATE_LINE', UpdateLineCommandData>
  | QueuedLineCommand<'REMOVE_LINE', RemoveLineCommandData>
  | QueuedOrderCommand<'SEND_ORDER', SendOrderCommandData>
  | QueuedOrderCommand<'ADD_PAYMENT', AddPaymentCommandData>
  | QueuedOrderCommand<'FINALIZE_ORDER', FinalizeOrderCommandData>
  | QueuedKitchenTicketCommand;

export interface DeviceCommandData {
  enterpriseId?: string;
  deviceId: string;
  clientCreatedAt: string;
}

export interface CashRegisterCommandData {
  enterpriseId?: string;
  cashRegisterId: string;
  clientCreatedAt: string;
}

export interface VersionedDeviceCommandData extends DeviceCommandData {
  expectedVersion: number;
}

export interface VersionedCashRegisterCommandData extends CashRegisterCommandData {
  expectedVersion: number;
}

interface QueueMetadata<TType extends PosCommandType, TData> {
  clientMutationId: string;
  deviceId: string;
  enterpriseId: string;
  employeeId?: string;
  clientCreatedAt: string;
  expectedVersion?: number;
  type: TType;
  data: TData;
  status: PosCommandStatus;
  attempts: number;
  lastErrorCode?: string;
  nextAttemptAt?: string;
}

interface QueuedCreateOrderCommand extends QueueMetadata<'CREATE_ORDER', CreateOrderCommandData> {
  aggregateId: string;
  targetId?: never;
}

interface QueuedOrderCommand<
  TType extends 'SEND_ORDER' | 'ADD_PAYMENT' | 'FINALIZE_ORDER',
  TData
> extends QueueMetadata<TType, TData> {
  aggregateId: string;
  targetId?: never;
}

interface QueuedLineCommand<TType extends 'ADD_LINE' | 'UPDATE_LINE' | 'REMOVE_LINE', TData> extends QueueMetadata<
  TType,
  TData
> {
  aggregateId: string;
  targetId: string;
}

interface QueuedKitchenTicketCommand extends QueueMetadata<'UPDATE_KITCHEN_TICKET', UpdateKitchenTicketCommandData> {
  aggregateId: string;
  targetId?: never;
}
