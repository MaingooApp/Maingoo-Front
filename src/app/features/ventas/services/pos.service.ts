import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseHttpService } from '@app/core/services/base-http.service';
import { environment } from '@env/environment';

import {
  AddLineCommandData,
  AddPaymentCommandData,
  CancelOrderCommandData,
  CancelRefundCommandData,
  CloseCashSessionCommandData,
  CreateCashMovementCommandData,
  CreateOrderCommandData,
  CreateRefundCommandData,
  FinalizeOrderCommandData,
  OpenCashSessionCommandData,
  SendOrderCommandData,
  UpdateKitchenTicketCommandData,
  UpdateLineCommandData,
  VoidLineCommandData,
  VoidPaymentCommandData
} from '../models/pos-command.models';
import {
  CashMovement,
  CashSessionWithMovements,
  DailySalesSummary,
  FiscalDocumentSummary,
  FiscalDocumentType,
  FiscalReceipt,
  FiscalSubmissionStatus,
  KitchenTicketListItem,
  KitchenTicketUpdateResponse,
  KitchenTicketStatus,
  PagedResponse,
  Payment,
  PosBootstrapResponse,
  PosOperationalSyncResponse,
  PosOrder,
  PosOrderChannel,
  PosOrderStatus,
  Refund
} from '../models/pos.models';

export interface PosOrderFilters {
  enterpriseId?: string;
  status?: PosOrderStatus;
  channel?: PosOrderChannel;
  tableId?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface KitchenTicketFilters {
  enterpriseId?: string;
  status?: KitchenTicketStatus;
  stationId?: string;
  orderId?: string;
  updatedAfter?: string;
  page?: number;
  limit?: number;
}

export interface DailySalesFilters {
  enterpriseId?: string;
  date?: string;
  deviceId?: string;
}

export interface FiscalDocumentFilters {
  enterpriseId?: string;
  submissionStatus?: FiscalSubmissionStatus;
  type?: FiscalDocumentType;
  orderId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface FiscalDocumentPage {
  items: FiscalDocumentSummary[];
  limit: number;
  nextCursor: string | null;
}

export interface PaymentResponse extends Payment {
  orderVersion: number | null;
}

export interface VoidPaymentResponse {
  payment: Payment;
  orderVersion: number;
}

export interface CancelRefundResponse {
  refund: Refund;
  orderVersion: number;
  fiscalCompensationDocumentId: string | null;
}

@Injectable({ providedIn: 'root' })
export class PosService extends BaseHttpService {
  private readonly apiUrl = `${environment.urlBackend}api/pos`;

  constructor(http: HttpClient) {
    super(http);
  }

  getBootstrap(deviceId?: string, cursor?: string, enterpriseId?: string): Observable<PosBootstrapResponse> {
    return this.get<PosBootstrapResponse>(
      `${this.apiUrl}/bootstrap`,
      undefined,
      this.params({ deviceId, cursor, enterpriseId })
    );
  }

  getSync(deviceId: string, cursor?: string, enterpriseId?: string): Observable<PosOperationalSyncResponse> {
    return this.get<PosOperationalSyncResponse>(
      `${this.apiUrl}/sync`,
      undefined,
      this.params({ deviceId, cursor, enterpriseId })
    );
  }

  createOrder(command: CreateOrderCommandData, idempotencyKey: string): Observable<PosOrder> {
    return this.post<PosOrder>(`${this.apiUrl}/orders`, command, this.idempotencyHeader(idempotencyKey));
  }

  listOrders(filters: PosOrderFilters = {}): Observable<PagedResponse<PosOrder>> {
    return this.get<PagedResponse<PosOrder>>(`${this.apiUrl}/orders`, undefined, this.params(filters));
  }

  getOrder(orderId: string, enterpriseId?: string): Observable<PosOrder> {
    return this.get<PosOrder>(`${this.apiUrl}/orders/${orderId}`, undefined, this.params({ enterpriseId }));
  }

  addLine(orderId: string, command: AddLineCommandData, idempotencyKey: string): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/lines`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  updateLine(
    orderId: string,
    lineId: string,
    command: UpdateLineCommandData,
    idempotencyKey: string
  ): Observable<PosOrder> {
    return this.patch<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/lines/${lineId}`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  sendOrder(orderId: string, command: SendOrderCommandData, idempotencyKey: string): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/send`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  cancelOrder(orderId: string, command: CancelOrderCommandData, idempotencyKey: string): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/cancel`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  voidLine(orderId: string, command: VoidLineCommandData, idempotencyKey: string): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/void-line`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  addPayment(orderId: string, command: AddPaymentCommandData, idempotencyKey: string): Observable<PaymentResponse> {
    return this.post<PaymentResponse>(
      `${this.apiUrl}/orders/${orderId}/payments`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  voidPayment(
    orderId: string,
    paymentId: string,
    command: VoidPaymentCommandData,
    idempotencyKey: string
  ): Observable<VoidPaymentResponse> {
    return this.post<VoidPaymentResponse>(
      `${this.apiUrl}/orders/${orderId}/payments/${paymentId}/void`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  finalizeOrder(orderId: string, command: FinalizeOrderCommandData, idempotencyKey: string): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/finalize`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  createRefund(orderId: string, command: CreateRefundCommandData, idempotencyKey: string): Observable<Refund> {
    return this.post<Refund>(
      `${this.apiUrl}/orders/${orderId}/refunds`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  cancelRefund(
    orderId: string,
    refundId: string,
    command: CancelRefundCommandData,
    idempotencyKey: string
  ): Observable<CancelRefundResponse> {
    return this.post<CancelRefundResponse>(
      `${this.apiUrl}/orders/${orderId}/refunds/${refundId}/cancel`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  listKitchenTickets(filters: KitchenTicketFilters = {}): Observable<PagedResponse<KitchenTicketListItem>> {
    return this.get<PagedResponse<KitchenTicketListItem>>(
      `${this.apiUrl}/kitchen/tickets`,
      undefined,
      this.params(filters)
    );
  }

  updateKitchenTicket(
    command: UpdateKitchenTicketCommandData,
    idempotencyKey: string
  ): Observable<KitchenTicketUpdateResponse> {
    return this.patch<KitchenTicketUpdateResponse>(
      `${this.apiUrl}/kitchen/tickets`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  openCashSession(command: OpenCashSessionCommandData, idempotencyKey: string): Observable<CashSessionWithMovements> {
    return this.post<CashSessionWithMovements>(
      `${this.apiUrl}/cash-sessions/open`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  getCurrentCashSession(deviceId: string, enterpriseId?: string): Observable<CashSessionWithMovements | null> {
    return this.get<CashSessionWithMovements | null>(
      `${this.apiUrl}/cash-sessions/current`,
      undefined,
      this.params({ deviceId, enterpriseId })
    );
  }

  createCashMovement(
    sessionId: string,
    command: CreateCashMovementCommandData,
    idempotencyKey: string
  ): Observable<CashMovement> {
    return this.post<CashMovement>(
      `${this.apiUrl}/cash-sessions/${sessionId}/movements`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  closeCashSession(
    sessionId: string,
    command: CloseCashSessionCommandData,
    idempotencyKey: string
  ): Observable<CashSessionWithMovements> {
    return this.post<CashSessionWithMovements>(
      `${this.apiUrl}/cash-sessions/${sessionId}/close`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  listFiscalDocuments(filters: FiscalDocumentFilters = {}): Observable<FiscalDocumentPage> {
    return this.get<FiscalDocumentPage>(`${this.apiUrl}/fiscal-documents`, undefined, this.params(filters));
  }

  getReceipt(fiscalDocumentId: string, enterpriseId?: string): Observable<FiscalReceipt> {
    return this.get<FiscalReceipt>(
      `${this.apiUrl}/fiscal-documents/${fiscalDocumentId}/receipt`,
      undefined,
      this.params({ enterpriseId })
    );
  }

  getDailySales(filters: DailySalesFilters = {}): Observable<DailySalesSummary> {
    return this.get<DailySalesSummary>(`${this.apiUrl}/reports/daily-sales`, undefined, this.params(filters));
  }

  private idempotencyHeader(idempotencyKey: string): Record<string, string> {
    return { 'Idempotency-Key': idempotencyKey };
  }

  private params(values: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
