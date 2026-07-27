import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Observable, finalize, forkJoin, fromEvent, map, of, switchMap, throwError } from 'rxjs';

import { AppPermission } from '@core/constants/permissions.enum';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

import { ReceiptViewComponent } from '../../components/payment/receipt-view.component';
import { CreateRefundCommandData } from '../../models/pos-command.models';
import {
  DiningTable,
  FiscalDocument,
  Payment,
  PosDevice,
  PosOrder,
  PosOrderChannel,
  PosOrderStatus
} from '../../models/pos.models';
import { PosOrderFilters, PosService } from '../../services/pos.service';

const DEVICE_STORAGE_KEY = 'maingoo-pos-device-id';
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;

type StatusFilter = '' | PosOrderStatus;
type ChannelFilter = '' | PosOrderChannel;

interface RefundAttempt {
  fingerprint: string;
  idempotencyKey: string;
  command: CreateRefundCommandData;
}

interface ApiFailure {
  code: string;
  message: string | null;
}

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    ButtonModule,
    CommonModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    ReceiptViewComponent,
    SkeletonComponent,
    TableModule,
    TranslateModule
  ],
  templateUrl: './sales-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesHistoryComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly posService = inject(PosService);
  private readonly permissions = inject(NgxPermissionsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  private detailFocusTarget: HTMLElement | null = null;
  private refundFocusTarget: HTMLElement | null = null;
  private receiptFocusTarget: HTMLElement | null = null;
  private refundAttempt: RefundAttempt | null = null;

  readonly statuses: PosOrderStatus[] = ['DRAFT', 'OPEN', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];
  readonly channels: PosOrderChannel[] = ['DINE_IN', 'TAKEAWAY'];
  readonly canRefund = !!this.permissions.getPermission(AppPermission.PosRefund);
  readonly canReadFiscal = !!this.permissions.getPermission(AppPermission.FiscalRead);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly loading = signal(true);
  readonly loadErrorCode = signal<string | null>(null);
  readonly loadErrorMessage = signal<string | null>(null);
  readonly optionsLoading = signal(true);
  readonly optionsErrorCode = signal<string | null>(null);
  readonly optionsErrorMessage = signal<string | null>(null);
  readonly orders = signal<PosOrder[]>([]);
  readonly tables = signal<DiningTable[]>([]);
  readonly devices = signal<PosDevice[]>([]);
  readonly currency = signal('EUR');
  readonly page = signal(1);
  readonly nextPageNumber = signal<number | null>(null);
  readonly detailVisible = signal(false);
  readonly detailLoading = signal(false);
  readonly detailErrorCode = signal<string | null>(null);
  readonly detailErrorMessage = signal<string | null>(null);
  readonly detailOrderId = signal<string | null>(null);
  readonly selectedOrder = signal<PosOrder | null>(null);
  readonly receiptVisible = signal(false);
  readonly receiptDocument = signal<FiscalDocument | null>(null);
  readonly refundVisible = signal(false);
  readonly refundConfirming = signal(false);
  readonly refundSubmitting = signal(false);
  readonly refundErrorCode = signal<string | null>(null);
  readonly refundErrorMessage = signal<string | null>(null);
  readonly refundSuccess = signal(false);

  status: StatusFilter = '';
  channel: ChannelFilter = '';
  tableId = '';
  deviceId = '';
  from = '';
  to = '';
  limit = 20;
  refundPaymentId = '';
  refundAmount = '';
  refundReason = '';

  readonly recordedPayments = computed(() =>
    (this.selectedOrder()?.payments ?? []).filter(({ status }) => status === 'RECORDED')
  );
  readonly orderRefundableCents = computed(() => {
    const order = this.selectedOrder();
    if (!order) return 0;
    const paid = Math.min(cents(order.paidGross), cents(order.totalGross));
    const refunded = order.refunds
      .filter(({ status }) => status === 'RECORDED')
      .reduce((sum, refund) => sum + cents(refund.amount), 0);
    return Math.max(0, paid - refunded);
  });

  selectedRefundPayment(): Payment | null {
    return this.recordedPayments().find(({ id }) => id === this.refundPaymentId) ?? null;
  }

  refundLimitCents(): number {
    const order = this.selectedOrder();
    const payment = this.selectedRefundPayment();
    if (!order || !payment) return 0;
    const refunded = order.refunds
      .filter(({ status, paymentId }) => status === 'RECORDED' && paymentId === payment.id)
      .reduce((sum, refund) => sum + cents(refund.amount), 0);
    return Math.max(0, Math.min(this.orderRefundableCents(), cents(payment.amount) - refunded));
  }

  refundLimit(): string {
    return money(this.refundLimitCents());
  }

  hasActiveDevice(): boolean {
    const selectedDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    return this.devices().some(
      ({ id, status, type }) => id === selectedDeviceId && status === 'ACTIVE' && type === 'REGISTER'
    );
  }

  canOpenRefund(): boolean {
    return (
      this.canRefund &&
      this.online() &&
      this.hasActiveDevice() &&
      this.selectedOrder()?.status === 'PAID' &&
      this.orderRefundableCents() > 0 &&
      this.recordedPayments().length > 0
    );
  }

  refundFormValid(): boolean {
    const amount = optionalCents(this.refundAmount);
    const reasonLength = this.refundReason.trim().length;
    return (
      this.online() &&
      !!this.selectedRefundPayment() &&
      amount !== null &&
      amount > 0 &&
      amount <= this.refundLimitCents() &&
      reasonLength >= 3 &&
      reasonLength <= 300
    );
  }

  ngOnInit(): void {
    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.online.set(true));
    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.online.set(false));
    this.loadFilterOptions();
    this.loadOrders();
  }

  loadFilterOptions(): void {
    this.optionsLoading.set(true);
    this.optionsErrorCode.set(null);
    this.optionsErrorMessage.set(null);
    forkJoin({
      settings: this.posService.getSettings(),
      tables: this.posService.listTables({}),
      devices: this.posService.listDevices({})
    })
      .pipe(
        finalize(() => this.optionsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ settings, tables, devices }) => {
          this.currency.set(settings.currency);
          this.tables.set([...tables].sort((left, right) => left.sortOrder - right.sortOrder));
          this.devices.set([...devices].sort((left, right) => left.name.localeCompare(right.name)));
        },
        error: (error: unknown) => {
          const failure = apiFailure(error);
          this.optionsErrorCode.set(failure.code);
          this.optionsErrorMessage.set(failure.message);
        }
      });
  }

  loadOrders(): void {
    this.loading.set(true);
    this.loadErrorCode.set(null);
    this.loadErrorMessage.set(null);
    this.posService
      .listOrders(this.filters())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.orders.set(response.items);
          this.page.set(response.page);
          this.nextPageNumber.set(response.nextPage);
        },
        error: (error: unknown) => {
          const failure = apiFailure(error);
          this.loadErrorCode.set(failure.code);
          this.loadErrorMessage.set(failure.message);
        }
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadOrders();
  }

  clearFilters(): void {
    this.status = '';
    this.channel = '';
    this.tableId = '';
    this.deviceId = '';
    this.from = '';
    this.to = '';
    this.applyFilters();
  }

  previousPage(): void {
    if (this.page() <= 1 || this.loading()) return;
    this.page.update((page) => page - 1);
    this.loadOrders();
  }

  nextPage(): void {
    const nextPage = this.nextPageNumber();
    if (!nextPage || this.loading()) return;
    this.page.set(nextPage);
    this.loadOrders();
  }

  openDetails(order: PosOrder, event?: Event): void {
    this.detailFocusTarget = focusTarget(event);
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.detailErrorCode.set(null);
    this.detailErrorMessage.set(null);
    this.detailOrderId.set(order.id);
    this.selectedOrder.set(null);
    this.posService
      .getOrder(order.id)
      .pipe(
        finalize(() => this.detailLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (detail) => this.selectedOrder.set(detail),
        error: (error: unknown) => {
          const failure = apiFailure(error);
          this.detailErrorCode.set(failure.code);
          this.detailErrorMessage.set(failure.message);
        }
      });
  }

  retryDetails(orderId: string): void {
    const fallback = this.orders().find(({ id }) => id === orderId);
    if (fallback) this.openDetails(fallback);
  }

  closeDetails(): void {
    this.detailVisible.set(false);
    this.returnFocus(this.detailFocusTarget);
  }

  openReceipt(document: FiscalDocument, event?: Event): void {
    if (!this.canReadFiscal) return;
    this.receiptFocusTarget = focusTarget(event);
    this.receiptDocument.set(document);
    this.receiptVisible.set(true);
  }

  closeReceipt(): void {
    this.receiptVisible.set(false);
    this.receiptDocument.set(null);
    this.returnFocus(this.receiptFocusTarget);
  }

  openRefund(event?: Event): void {
    if (!this.canOpenRefund()) return;
    this.refundFocusTarget = focusTarget(event);
    this.refundPaymentId = this.recordedPayments()[0]?.id ?? '';
    this.refundAmount = this.refundLimit();
    this.refundReason = '';
    this.refundAttempt = null;
    this.refundErrorCode.set(null);
    this.refundErrorMessage.set(null);
    this.refundSuccess.set(false);
    this.refundVisible.set(true);
  }

  closeRefund(): void {
    if (this.refundSubmitting()) return;
    this.refundVisible.set(false);
    this.refundConfirming.set(false);
    this.returnFocus(this.refundFocusTarget);
  }

  confirmRefund(): void {
    if (!this.refundFormValid() || this.refundConfirming() || this.refundSubmitting()) return;
    this.refundConfirming.set(true);
    const config: Confirmation = {
      header: this.translate.instant('pos.history.refund.confirmTitle'),
      message: this.translate.instant('pos.history.refund.confirmMessage'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('pos.history.refund.confirm'),
      rejectLabel: this.translate.instant('pos.actions.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.refundConfirming.set(false);
        this.submitRefund();
      },
      reject: () => this.refundConfirming.set(false)
    };
    this.confirmation.confirm(config);
  }

  tableName(tableId: string | null): string {
    return tableId ? (this.tables().find(({ id }) => id === tableId)?.name ?? tableId) : '—';
  }

  deviceName(deviceId: string): string {
    return this.devices().find(({ id }) => id === deviceId)?.name ?? deviceId;
  }

  private submitRefund(): void {
    const order = this.selectedOrder();
    const payment = this.selectedRefundPayment();
    const deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!order || !payment || !deviceId || !this.refundFormValid() || this.refundSubmitting()) return;

    const amount = money(optionalCents(this.refundAmount) ?? 0);
    const reason = this.refundReason.trim();
    const fingerprint = [order.id, order.version, payment.id, amount, reason].join('|');
    this.refundSubmitting.set(true);
    this.refundErrorCode.set(null);
    this.refundErrorMessage.set(null);

    this.refundRequest(order, payment, deviceId, amount, reason, fingerprint)
      .pipe(
        switchMap(({ command, idempotencyKey }) => this.posService.createRefund(order.id, command, idempotencyKey)),
        switchMap(() => this.posService.getOrder(order.id)),
        finalize(() => this.refundSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updated) => {
          this.selectedOrder.set(updated);
          this.orders.update((orders) => orders.map((item) => (item.id === updated.id ? updated : item)));
          this.refundAttempt = null;
          this.refundVisible.set(false);
          this.refundSuccess.set(true);
          this.returnFocus(this.refundFocusTarget);
        },
        error: (error: unknown) => {
          const failure = apiFailure(error);
          this.refundErrorCode.set(failure.code);
          this.refundErrorMessage.set(failure.message);
        }
      });
  }

  private refundRequest(
    order: PosOrder,
    payment: Payment,
    deviceId: string,
    amount: string,
    reason: string,
    fingerprint: string
  ): Observable<RefundAttempt> {
    if (this.refundAttempt?.fingerprint === fingerprint) return of(this.refundAttempt);

    return this.cashSessionFor(payment, deviceId).pipe(
      map((cashSessionId) => {
        const attempt: RefundAttempt = {
          fingerprint,
          idempotencyKey: crypto.randomUUID(),
          command: {
            deviceId,
            clientCreatedAt: new Date().toISOString(),
            expectedVersion: order.version,
            paymentId: payment.id,
            cashSessionId: cashSessionId ?? undefined,
            amount,
            reason
          }
        };
        this.refundAttempt = attempt;
        return attempt;
      })
    );
  }

  private cashSessionFor(payment: Payment, deviceId: string): Observable<string | null> {
    if (payment.method !== 'CASH') return of(null);
    return this.posService
      .getCurrentCashSession(deviceId)
      .pipe(
        switchMap((session) =>
          session ? of(session.id) : throwError(() => ({ code: 'OPEN_CASH_SESSION_NOT_FOUND' satisfies string }))
        )
      );
  }

  private filters(): PosOrderFilters {
    return {
      status: this.status || undefined,
      channel: this.channel || undefined,
      tableId: this.tableId || undefined,
      deviceId: this.deviceId || undefined,
      from: dateBoundary(this.from, false),
      to: dateBoundary(this.to, true),
      page: this.page(),
      limit: this.limit
    };
  }

  private returnFocus(target: HTMLElement | null): void {
    if (target) queueMicrotask(() => target.focus());
  }
}

function optionalCents(value: string): number | null {
  if (!MONEY_PATTERN.test(value)) return null;
  const [units, decimal = ''] = value.split('.');
  return Number(units) * 100 + Number(decimal.padEnd(2, '0'));
}

function cents(value: string): number {
  return optionalCents(value) ?? 0;
}

function money(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

function dateBoundary(value: string, endOfDay: boolean): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) {
    date.setDate(date.getDate() + 1);
    date.setMilliseconds(-1);
  }
  return date.toISOString();
}

function apiFailure(error: unknown): ApiFailure {
  if (typeof error !== 'object' || error === null) return { code: 'UNKNOWN', message: null };
  if ('code' in error && typeof error.code === 'string') {
    return { code: error.code, message: errorMessage(error) };
  }
  if ('error' in error && typeof error.error === 'object' && error.error !== null) {
    const response = error.error;
    if ('code' in response && typeof response.code === 'string') {
      return { code: response.code, message: errorMessage(response) };
    }
  }
  return { code: 'UNKNOWN', message: errorMessage(error) };
}

function errorMessage(value: object): string | null {
  if (!('message' in value)) return null;
  if (typeof value.message === 'string') return value.message;
  if (Array.isArray(value.message) && value.message.every((item) => typeof item === 'string')) {
    return value.message.join(' · ');
  }
  return null;
}

function focusTarget(event?: Event): HTMLElement | null {
  return event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
}
