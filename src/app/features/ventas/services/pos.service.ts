import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseHttpService } from '@app/core/services/base-http.service';
import { environment } from '@env/environment';
import { POS_AUTH_MODE, PosAuthMode } from '../../device/interceptors/pos-auth.context';

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
  VersionedDeviceCommandData,
  VoidLineCommandData,
  VoidPaymentCommandData
} from '../models/pos-command.models';
import {
  ActiveListFilters,
  CreateCashRegisterDto,
  CreateKitchenStationDto,
  CreateModifierGroupDto,
  CreatePosAreaDto,
  CreatePosDeviceDto,
  CreatePosMenuCategoryDto,
  CreatePosMenuItemDto,
  CreatePosTableDto,
  EnterpriseScopedFilters,
  ListPosDevicesFilters,
  ListPosMenuItemsFilters,
  ListPosTablesFilters,
  RevokePosDeviceDto,
  UpdateKitchenStationDto,
  UpdateCashRegisterDto,
  UpdateModifierGroupDto,
  UpdatePosAreaDto,
  UpdatePosDeviceDto,
  UpdatePosMenuCategoryDto,
  UpdatePosMenuItemDto,
  UpdatePosSettingsDto,
  UpdatePosTableDto
} from '../models/pos-configuration.models';
import {
  CashRegister,
  CashMovement,
  CashDeviationReport,
  CashSessionWithMovements,
  DailySalesSummary,
  DiningArea,
  DiningTable,
  FiscalDocumentSummary,
  FiscalDocumentType,
  FiscalReceipt,
  FiscalSubmissionStatus,
  KitchenStation,
  KitchenTicketListItem,
  KitchenTicketUpdateResponse,
  KitchenTicketStatus,
  IncompleteCostsReport,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  PagedResponse,
  Payment,
  PosBootstrapResponse,
  PosDevice,
  PosOperationalSyncResponse,
  PosOrder,
  PosOrderChannel,
  PosOrderStatus,
  PosSettings,
  Refund,
  SalesBreakdownReport,
  SalesByHourReport,
  SalesByPaymentMethodReport
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

  getBootstrap(
    deviceId?: string,
    cursor?: string,
    enterpriseId?: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosBootstrapResponse> {
    return this.get<PosBootstrapResponse>(
      `${this.apiUrl}/bootstrap`,
      undefined,
      this.params({ deviceId, cursor, enterpriseId }),
      this.authContext(authMode)
    );
  }

  getSync(
    deviceId: string,
    cursor?: string,
    enterpriseId?: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOperationalSyncResponse> {
    return this.get<PosOperationalSyncResponse>(
      `${this.apiUrl}/sync`,
      undefined,
      this.params({ deviceId, cursor, enterpriseId }),
      this.authContext(authMode)
    );
  }

  getSettings(enterpriseId?: string): Observable<PosSettings> {
    return this.get<PosSettings>(`${this.apiUrl}/settings`, undefined, this.params({ enterpriseId }));
  }

  updateSettings(dto: UpdatePosSettingsDto): Observable<PosSettings> {
    return this.put<PosSettings>(`${this.apiUrl}/settings`, dto);
  }

  listDevices(filters: ListPosDevicesFilters = {}): Observable<PosDevice[]> {
    return this.get<PosDevice[]>(`${this.apiUrl}/devices`, undefined, this.params(filters));
  }

  createDevice(dto: CreatePosDeviceDto): Observable<PosDevice> {
    return this.post<PosDevice>(`${this.apiUrl}/devices`, dto);
  }

  updateDevice(deviceId: string, dto: UpdatePosDeviceDto): Observable<PosDevice> {
    return this.patch<PosDevice>(`${this.apiUrl}/devices/${deviceId}`, dto);
  }

  revokeDevice(deviceId: string, dto: RevokePosDeviceDto): Observable<unknown> {
    return this.post(`${this.apiUrl}/devices/${deviceId}/revoke`, dto);
  }

  listCashRegisters(filters: ActiveListFilters = {}): Observable<CashRegister[]> {
    return this.get<CashRegister[]>(`${this.apiUrl}/cash-registers`, undefined, this.params(filters));
  }

  createCashRegister(dto: CreateCashRegisterDto): Observable<CashRegister> {
    return this.post<CashRegister>(`${this.apiUrl}/cash-registers`, dto);
  }

  updateCashRegister(id: string, dto: UpdateCashRegisterDto): Observable<CashRegister> {
    return this.patch<CashRegister>(`${this.apiUrl}/cash-registers/${id}`, dto);
  }

  deleteCashRegister(id: string, enterpriseId?: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.apiUrl}/cash-registers/${id}`, {
      params: this.params({ enterpriseId })
    });
  }

  listAreas(filters: ActiveListFilters = {}): Observable<DiningArea[]> {
    return this.get<DiningArea[]>(`${this.apiUrl}/areas`, undefined, this.params(filters));
  }

  createArea(dto: CreatePosAreaDto): Observable<DiningArea> {
    return this.post<DiningArea>(`${this.apiUrl}/areas`, dto);
  }

  updateArea(areaId: string, dto: UpdatePosAreaDto): Observable<DiningArea> {
    return this.patch<DiningArea>(`${this.apiUrl}/areas/${areaId}`, dto);
  }

  listTables(filters: ListPosTablesFilters = {}): Observable<DiningTable[]> {
    return this.get<DiningTable[]>(`${this.apiUrl}/tables`, undefined, this.params(filters));
  }

  createTable(dto: CreatePosTableDto): Observable<DiningTable> {
    return this.post<DiningTable>(`${this.apiUrl}/tables`, dto);
  }

  updateTable(tableId: string, dto: UpdatePosTableDto): Observable<DiningTable> {
    return this.patch<DiningTable>(`${this.apiUrl}/tables/${tableId}`, dto);
  }

  listMenuCategories(filters: ActiveListFilters = {}): Observable<MenuCategory[]> {
    return this.get<MenuCategory[]>(`${this.apiUrl}/menu/categories`, undefined, this.params(filters));
  }

  createMenuCategory(dto: CreatePosMenuCategoryDto): Observable<MenuCategory> {
    return this.post<MenuCategory>(`${this.apiUrl}/menu/categories`, dto);
  }

  updateMenuCategory(categoryId: string, dto: UpdatePosMenuCategoryDto): Observable<MenuCategory> {
    return this.patch<MenuCategory>(`${this.apiUrl}/menu/categories/${categoryId}`, dto);
  }

  listMenuItems(filters: ListPosMenuItemsFilters = {}): Observable<MenuItem[]> {
    return this.get<MenuItem[]>(`${this.apiUrl}/menu/items`, undefined, this.params(filters));
  }

  createMenuItem(dto: CreatePosMenuItemDto): Observable<MenuItem> {
    return this.post<MenuItem>(`${this.apiUrl}/menu/items`, dto);
  }

  updateMenuItem(itemId: string, dto: UpdatePosMenuItemDto): Observable<MenuItem> {
    return this.patch<MenuItem>(`${this.apiUrl}/menu/items/${itemId}`, dto);
  }

  listKitchenStations(
    filters: ActiveListFilters = {},
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<KitchenStation[]> {
    return this.get<KitchenStation[]>(
      `${this.apiUrl}/kitchen/stations`,
      undefined,
      this.params(filters),
      this.authContext(authMode)
    );
  }

  createKitchenStation(dto: CreateKitchenStationDto): Observable<KitchenStation> {
    return this.post<KitchenStation>(`${this.apiUrl}/kitchen/stations`, dto);
  }

  updateKitchenStation(stationId: string, dto: UpdateKitchenStationDto): Observable<KitchenStation> {
    return this.patch<KitchenStation>(`${this.apiUrl}/kitchen/stations/${stationId}`, dto);
  }

  listModifierGroups(filters: EnterpriseScopedFilters = {}): Observable<ModifierGroup[]> {
    return this.get<ModifierGroup[]>(`${this.apiUrl}/menu/modifier-groups`, undefined, this.params(filters));
  }

  createModifierGroup(dto: CreateModifierGroupDto): Observable<ModifierGroup> {
    return this.post<ModifierGroup>(`${this.apiUrl}/menu/modifier-groups`, dto);
  }

  updateModifierGroup(groupId: string, dto: UpdateModifierGroupDto): Observable<ModifierGroup> {
    return this.patch<ModifierGroup>(`${this.apiUrl}/menu/modifier-groups/${groupId}`, dto);
  }

  createOrder(
    command: CreateOrderCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
    );
  }

  listOrders(filters: PosOrderFilters = {}, authMode: PosAuthMode = 'HUMAN'): Observable<PagedResponse<PosOrder>> {
    return this.get<PagedResponse<PosOrder>>(
      `${this.apiUrl}/orders`,
      undefined,
      this.params(filters),
      this.authContext(authMode)
    );
  }

  getOrder(orderId: string, enterpriseId?: string, authMode: PosAuthMode = 'HUMAN'): Observable<PosOrder> {
    return this.get<PosOrder>(
      `${this.apiUrl}/orders/${orderId}`,
      undefined,
      this.params({ enterpriseId }),
      this.authContext(authMode)
    );
  }

  addLine(
    orderId: string,
    command: AddLineCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/lines`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
    );
  }

  updateLine(
    orderId: string,
    lineId: string,
    command: UpdateLineCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOrder> {
    return this.patch<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/lines/${lineId}`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
    );
  }

  removeLine(
    orderId: string,
    lineId: string,
    command: VersionedDeviceCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/lines/${lineId}/remove`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
    );
  }

  sendOrder(
    orderId: string,
    command: SendOrderCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/send`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
    );
  }

  cancelOrder(
    orderId: string,
    command: CancelOrderCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/cancel`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
    );
  }

  voidLine(
    orderId: string,
    command: VoidLineCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PosOrder> {
    return this.post<PosOrder>(
      `${this.apiUrl}/orders/${orderId}/void-line`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
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

  listKitchenTickets(
    filters: KitchenTicketFilters = {},
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<PagedResponse<KitchenTicketListItem>> {
    return this.get<PagedResponse<KitchenTicketListItem>>(
      `${this.apiUrl}/kitchen/tickets`,
      undefined,
      this.params(filters),
      this.authContext(authMode)
    );
  }

  updateKitchenTicket(
    command: UpdateKitchenTicketCommandData,
    idempotencyKey: string,
    authMode: PosAuthMode = 'HUMAN'
  ): Observable<KitchenTicketUpdateResponse> {
    return this.patch<KitchenTicketUpdateResponse>(
      `${this.apiUrl}/kitchen/tickets`,
      command,
      this.idempotencyHeader(idempotencyKey),
      this.authContext(authMode)
    );
  }

  openCashSession(command: OpenCashSessionCommandData, idempotencyKey: string): Observable<CashSessionWithMovements> {
    return this.post<CashSessionWithMovements>(
      `${this.apiUrl}/cash-sessions/open`,
      command,
      this.idempotencyHeader(idempotencyKey)
    );
  }

  getCurrentCashSession(cashRegisterId: string, enterpriseId?: string): Observable<CashSessionWithMovements | null> {
    return this.get<CashSessionWithMovements | null>(
      `${this.apiUrl}/cash-sessions/current`,
      undefined,
      this.params({ cashRegisterId, enterpriseId })
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

  getSalesByItem(filters: DailySalesFilters = {}): Observable<SalesBreakdownReport> {
    return this.get<SalesBreakdownReport>(`${this.apiUrl}/reports/sales-by-item`, undefined, this.params(filters));
  }

  getSalesByCategory(filters: DailySalesFilters = {}): Observable<SalesBreakdownReport> {
    return this.get<SalesBreakdownReport>(`${this.apiUrl}/reports/sales-by-category`, undefined, this.params(filters));
  }

  getSalesByHour(filters: DailySalesFilters = {}): Observable<SalesByHourReport> {
    return this.get<SalesByHourReport>(`${this.apiUrl}/reports/sales-by-hour`, undefined, this.params(filters));
  }

  getSalesByPaymentMethod(filters: DailySalesFilters = {}): Observable<SalesByPaymentMethodReport> {
    return this.get<SalesByPaymentMethodReport>(
      `${this.apiUrl}/reports/sales-by-payment-method`,
      undefined,
      this.params(filters)
    );
  }

  getCashDeviation(filters: DailySalesFilters = {}): Observable<CashDeviationReport> {
    return this.get<CashDeviationReport>(`${this.apiUrl}/reports/cash-deviation`, undefined, this.params(filters));
  }

  getIncompleteCosts(filters: DailySalesFilters = {}): Observable<IncompleteCostsReport> {
    return this.get<IncompleteCostsReport>(`${this.apiUrl}/reports/incomplete-costs`, undefined, this.params(filters));
  }

  private idempotencyHeader(idempotencyKey: string): Record<string, string> {
    return { 'Idempotency-Key': idempotencyKey };
  }

  private authContext(authMode: PosAuthMode): HttpContext {
    return new HttpContext().set(POS_AUTH_MODE, authMode);
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
