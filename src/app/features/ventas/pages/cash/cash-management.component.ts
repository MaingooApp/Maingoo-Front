import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Observable, finalize, fromEvent, map, merge, of, switchMap, throwError } from 'rxjs';

import { AppPermission } from '@core/constants/permissions.enum';
import { AuthService } from '@features/auth/services/auth-service.service';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { randomUuid } from '@shared/helpers/random-uuid';

import {
  AddPaymentRequest,
  PaymentBlockedReason,
  PaymentDialogComponent
} from '../../components/payment/payment-dialog.component';
import { ReceiptViewComponent } from '../../components/payment/receipt-view.component';
import {
  CloseCashSessionCommandData,
  CreateCashMovementCommandData,
  OpenCashSessionCommandData
} from '../../models/pos-command.models';
import { PosOrderViewModel } from '../../models/pos-local.models';
import { CashRegister, CashSessionWithMovements, OperationalPosOrder, PosOrder } from '../../models/pos.models';
import { PosOfflineStorageError } from '../../services/pos-offline-queue.service';
import { PosService } from '../../services/pos.service';
import { PosSessionStore } from '../../services/pos-session.store';

const NON_NEGATIVE_MONEY = /^\d{1,10}(?:\.\d{1,2})?$/;
const POSITIVE_MONEY = /^(?!0(?:\.0+)?$)\d{1,10}(?:\.\d{1,2})?$/;
const NON_ZERO_MONEY = /^(?!-?0(?:\.0+)?$)-?\d{1,10}(?:\.\d{1,2})?$/;

type ManualMovementType = CreateCashMovementCommandData['type'];
type CashIntent =
  | { kind: 'OPEN'; key: string; command: OpenCashSessionCommandData }
  | { kind: 'MOVEMENT'; key: string; sessionId: string; command: CreateCashMovementCommandData }
  | { kind: 'CLOSE'; key: string; sessionId: string; command: CloseCashSessionCommandData };

@Component({
  selector: 'app-cash-management',
  standalone: true,
  imports: [
    ButtonModule,
    CommonModule,
    FormsModule,
    InputTextModule,
    PaymentDialogComponent,
    ReceiptViewComponent,
    RouterLink,
    SkeletonComponent,
    TranslateModule
  ],
  templateUrl: './cash-management.component.html',
  styleUrl: './cash-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashManagementComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly posService = inject(PosService);
  readonly store = inject(PosSessionStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);
  private registerLoadVersion = 0;
  private sessionLoadVersion = 0;

  readonly cashRegisters = signal<CashRegister[]>([]);
  readonly selectedCashRegisterId = signal('');
  readonly session = signal<CashSessionWithMovements | null>(null);
  readonly loadingCashRegisters = signal(true);
  readonly loadingSession = signal(false);
  readonly submitting = signal(false);
  readonly confirming = signal(false);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly cashRegisterLoadFailed = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successKey = signal<string | null>(null);
  readonly closing = signal(false);
  readonly lastIntent = signal<CashIntent | null>(null);
  readonly paymentVisible = signal(false);
  readonly receiptOrder = signal<OperationalPosOrder | PosOrder | null>(null);
  readonly orderSearch = signal('');
  readonly canReadFiscal = this.authService.hasPermission(AppPermission.FiscalRead);
  readonly canConfigureFiscal =
    (this.authService.hasPermission(AppPermission.PosManage) &&
      this.authService.hasPermission(AppPermission.FiscalWrite)) ||
    this.authService.hasPermission(AppPermission.AdminSuper);
  readonly canManageCashRegisters = this.authService.hasPermission(AppPermission.CashRegistersWrite);
  readonly payableOrders = computed(() => {
    const search = this.orderSearch().trim().toLocaleLowerCase();
    const tables = new Map(this.store.tables().map((table) => [table.id, table.name]));
    return this.store
      .activeOrders()
      .filter(
        (order) =>
          order.source === 'SERVER' &&
          (order.serverStatus === 'SENT' || order.serverStatus === 'PARTIALLY_PAID') &&
          order.pendingCommandCount === 0
      )
      .filter((order) => {
        if (!search) return true;
        const table = order.tableId ? tables.get(order.tableId) : null;
        return [order.displayNumber, table, order.channel].some((value) => value?.toLocaleLowerCase().includes(search));
      })
      .sort((left, right) => (right.orderNumber ?? 0) - (left.orderNumber ?? 0));
  });
  readonly paymentBlockedReason = computed<PaymentBlockedReason | null>(() => {
    if (!this.online()) return 'OFFLINE';
    return this.store.selectedOrder()?.pendingCommandCount ? 'PENDING_SYNC' : null;
  });
  readonly receiptFiscalDocument = computed(() => this.receiptOrder()?.fiscalDocuments.at(-1) ?? null);
  readonly receiptStockSyncStatus = computed(() => {
    const orderId = this.receiptOrder()?.id;
    if (!orderId) return null;
    const stored = this.store.authoritativeOrder(orderId);
    if (stored && 'stockSyncJob' in stored) return stored.stockSyncJob?.status ?? null;
    return this.store.stockSyncJobs().find((job) => job.orderId === orderId)?.status ?? null;
  });

  selectedCashRegister(): CashRegister | null {
    const enterpriseId = this.authService.getEnterpriseId();
    return (
      this.cashRegisters().find(
        ({ id, enterpriseId: registerEnterpriseId }) =>
          id === this.selectedCashRegisterId() && registerEnterpriseId === enterpriseId
      ) ?? null
    );
  }
  readonly busy = computed(() => this.submitting() || this.confirming());
  readonly movementTypes: ManualMovementType[] = ['PAY_IN', 'PAY_OUT', 'ADJUSTMENT'];

  openingAmount = '';
  movementType: ManualMovementType = 'PAY_IN';
  movementAmount = '';
  movementReason = '';
  countedCash = '';

  async ngOnInit(): Promise<void> {
    if (typeof window !== 'undefined') {
      merge(fromEvent(window, 'online').pipe(map(() => true)), fromEvent(window, 'offline').pipe(map(() => false)))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((online) => this.online.set(online));
    }

    const enterpriseId = this.authService.getEnterpriseId();
    if (enterpriseId) await this.store.initializeCashier(enterpriseId);
    this.loadCashRegisters();
  }

  loadCashRegisters(): void {
    const version = ++this.registerLoadVersion;
    ++this.sessionLoadVersion;
    const enterpriseId = this.authService.getEnterpriseId();
    this.loadingCashRegisters.set(true);
    this.cashRegisterLoadFailed.set(false);
    this.cashRegisters.set([]);
    this.selectedCashRegisterId.set('');
    this.session.set(null);
    this.clearFeedback();

    if (!enterpriseId) {
      this.loadingCashRegisters.set(false);
      this.cashRegisterLoadFailed.set(true);
      this.setError(new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_REQUIRED'), 'POS_DEVICE_LOAD_FAILED');
      return;
    }

    this.posService
      .listCashRegisters({ active: true })
      .pipe(
        finalize(() => {
          if (version === this.registerLoadVersion) this.loadingCashRegisters.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (registers) => {
          if (version !== this.registerLoadVersion || this.authService.getEnterpriseId() !== enterpriseId) return;
          this.cashRegisters.set(
            registers.filter(
              ({ enterpriseId: registerEnterpriseId, active }) => registerEnterpriseId === enterpriseId && active
            )
          );
          if (this.cashRegisters().length === 1) this.activateCashRegister(this.cashRegisters()[0].id);
        },
        error: (error: unknown) => {
          if (version !== this.registerLoadVersion) return;
          this.cashRegisterLoadFailed.set(true);
          this.setError(error, 'POS_DEVICE_LOAD_FAILED');
        }
      });
  }

  selectCashRegister(cashRegisterId: string): void {
    if (this.busy()) return;
    this.activateCashRegister(cashRegisterId);
  }

  private activateCashRegister(cashRegisterId: string): void {
    ++this.sessionLoadVersion;
    const enterpriseId = this.authService.getEnterpriseId();
    const cashRegister = this.cashRegisters().find(
      ({ id, enterpriseId: registerEnterpriseId, active }) =>
        id === cashRegisterId && registerEnterpriseId === enterpriseId && active
    );

    this.selectedCashRegisterId.set(cashRegister?.id ?? '');
    this.session.set(null);
    this.closing.set(false);
    this.lastIntent.set(null);
    this.paymentVisible.set(false);
    this.receiptOrder.set(null);
    this.store.selectOrder(null);
    this.clearFeedback();

    if (cashRegister) this.loadCurrentSession();
  }

  loadCurrentSession(): void {
    const cashRegisterId = this.selectedCashRegister()?.id;
    const enterpriseId = this.authService.getEnterpriseId();
    if (!cashRegisterId) return;

    const version = ++this.sessionLoadVersion;
    this.loadingSession.set(true);
    this.clearFeedback();
    this.posService
      .getCurrentCashSession(cashRegisterId)
      .pipe(
        finalize(() => {
          if (version === this.sessionLoadVersion) this.loadingSession.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (session) => {
          if (
            version !== this.sessionLoadVersion ||
            this.authService.getEnterpriseId() !== enterpriseId ||
            this.selectedCashRegister()?.id !== cashRegisterId
          ) {
            return;
          }
          if (session && (session.enterpriseId !== enterpriseId || session.cashRegisterId !== cashRegisterId)) {
            this.session.set(null);
            this.setError(new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_MISMATCH'), 'POS_CASH_LOAD_FAILED');
            return;
          }
          this.session.set(session);
          this.store.cashSession.set(session);
        },
        error: (error: unknown) => {
          if (version === this.sessionLoadVersion) this.setError(error, 'POS_CASH_LOAD_FAILED');
        }
      });
  }

  openingAmountValid(): boolean {
    return NON_NEGATIVE_MONEY.test(this.openingAmount);
  }

  movementAmountValid(): boolean {
    return (this.movementType === 'ADJUSTMENT' ? NON_ZERO_MONEY : POSITIVE_MONEY).test(this.movementAmount);
  }

  movementReasonValid(): boolean {
    const length = this.movementReason.trim().length;
    return length >= 3 && length <= 300;
  }

  countedCashValid(): boolean {
    return NON_NEGATIVE_MONEY.test(this.countedCash);
  }

  async openSession(): Promise<void> {
    const cashRegisterId = this.selectedCashRegister()?.id;
    if (!cashRegisterId || !this.online() || !this.openingAmountValid() || !(await this.confirm('open'))) return;

    this.executeIntent({
      kind: 'OPEN',
      key: randomUuid(),
      command: { cashRegisterId, openingAmount: this.openingAmount, clientCreatedAt: new Date().toISOString() }
    });
  }

  async createMovement(): Promise<void> {
    const current = this.session();
    if (
      current?.status !== 'OPEN' ||
      current.enterpriseId !== this.authService.getEnterpriseId() ||
      current.cashRegisterId !== this.selectedCashRegister()?.id ||
      !this.online() ||
      !this.movementAmountValid() ||
      !this.movementReasonValid() ||
      !(await this.confirm('movement'))
    ) {
      return;
    }

    this.executeIntent({
      kind: 'MOVEMENT',
      key: randomUuid(),
      sessionId: current.id,
      command: {
        cashRegisterId: current.cashRegisterId,
        type: this.movementType,
        amount: this.movementAmount,
        reason: this.movementReason.trim(),
        clientCreatedAt: new Date().toISOString()
      }
    });
  }

  startClosing(): void {
    const current = this.session();
    if (
      current?.status !== 'OPEN' ||
      current.enterpriseId !== this.authService.getEnterpriseId() ||
      current.cashRegisterId !== this.selectedCashRegister()?.id ||
      this.busy()
    ) {
      return;
    }
    this.countedCash = '';
    this.closing.set(true);
    this.clearFeedback();
  }

  cancelClosing(): void {
    if (!this.busy()) this.closing.set(false);
  }

  async closeSession(): Promise<void> {
    const current = this.session();
    if (
      current?.status !== 'OPEN' ||
      current.enterpriseId !== this.authService.getEnterpriseId() ||
      current.cashRegisterId !== this.selectedCashRegister()?.id ||
      !this.online() ||
      !this.countedCashValid() ||
      !(await this.confirm('close'))
    ) {
      return;
    }

    this.executeIntent({
      kind: 'CLOSE',
      key: randomUuid(),
      sessionId: current.id,
      command: {
        cashRegisterId: current.cashRegisterId,
        countedCash: this.countedCash,
        clientCreatedAt: new Date().toISOString()
      }
    });
  }

  retryLastAction(): void {
    const intent = this.lastIntent();
    if (!intent || !this.online() || this.busy()) return;
    this.executeIntent(intent);
  }

  printSummary(): void {
    window.print();
  }

  openPayment(order: PosOrderViewModel): void {
    if (
      !this.online() ||
      this.session()?.status !== 'OPEN' ||
      !this.payableOrders().some(({ id }) => id === order.id)
    ) {
      return;
    }
    this.store.selectOrder(order.id);
    this.receiptOrder.set(null);
    this.paymentVisible.set(true);
  }

  closePayment(): void {
    if (this.store.operationPending()) return;
    this.paymentVisible.set(false);
    this.store.selectOrder(null);
  }

  async addPayment(request: AddPaymentRequest): Promise<void> {
    await this.store.addPayment(request.method, request.amount, request.externalReference);
    const cashSession = this.store.cashSession();
    if (cashSession) this.session.set(cashSession);
  }

  async finalizeOrder(): Promise<void> {
    await this.store.finalizeSelectedOrder();
    const order = this.store.selectedAuthoritativeOrder();
    if (!this.store.operationErrorCode() && order?.status === 'PAID') {
      this.paymentVisible.set(false);
      this.receiptOrder.set(order);
      this.store.selectOrder(null);
    }
  }

  refreshPayableOrders(): void {
    void this.store.refreshCashierOrders();
  }

  closeReceipt(): void {
    this.receiptOrder.set(null);
  }

  orderLocation(order: PosOrderViewModel): string {
    if (!order.tableId) return this.translate.instant('pos.cash.orderPayment.takeaway');
    return this.store.tables().find(({ id }) => id === order.tableId)?.name ?? order.tableId;
  }

  orderReadyToFinalize(order: PosOrderViewModel): boolean {
    const total = order.authoritativeTotalGross ?? order.estimatedTotalGross;
    return total !== null && order.paidGross === total;
  }

  errorText(): string {
    const code = this.errorCode();
    if (!code) return '';

    const key = `pos.errors.${code}`;
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : (this.errorMessage() ?? code);
  }

  private async confirm(action: 'open' | 'movement' | 'close'): Promise<boolean> {
    if (this.busy()) return false;

    this.confirming.set(true);
    try {
      return await this.confirmDialog.confirm({
        header: this.translate.instant(`pos.cash.confirm.${action}Header`),
        message: this.translate.instant(`pos.cash.confirm.${action}Message`, {
          amount:
            action === 'open' ? this.openingAmount : action === 'movement' ? this.movementAmount : this.countedCash,
          type: this.translate.instant(`pos.cash.movementTypes.${this.movementType}`)
        }),
        acceptLabel: this.translate.instant(`pos.cash.confirm.${action}Accept`),
        rejectLabel: this.translate.instant('pos.cash.confirm.cancel'),
        icon: action === 'close' ? 'warning' : 'help'
      });
    } finally {
      this.confirming.set(false);
    }
  }

  private executeIntent(intent: CashIntent): void {
    if (this.busy() || intent.command.cashRegisterId !== this.selectedCashRegister()?.id) return;

    this.lastIntent.set(intent);
    this.submitting.set(true);
    this.clearFeedback(false);

    if (intent.kind === 'OPEN') {
      this.runIntent(intent, this.posService.openCashSession(intent.command, intent.key), (session) => {
        this.session.set(session);
        this.store.cashSession.set(session);
        this.openingAmount = '';
        this.successKey.set('pos.cash.success.opened');
      });
      return;
    }

    if (intent.kind === 'MOVEMENT') {
      const operation = this.posService.createCashMovement(intent.sessionId, intent.command, intent.key).pipe(
        switchMap(() => this.posService.getCurrentCashSession(intent.command.cashRegisterId)),
        switchMap((session) => (session ? of(session) : throwError(() => new Error('OPEN_CASH_SESSION_NOT_FOUND'))))
      );
      this.runIntent(intent, operation, (session) => {
        this.session.set(session);
        this.store.cashSession.set(session);
        this.movementAmount = '';
        this.movementReason = '';
        this.successKey.set('pos.cash.success.movementCreated');
      });
      return;
    }

    this.runIntent(
      intent,
      this.posService.closeCashSession(intent.sessionId, intent.command, intent.key),
      (session) => {
        this.session.set(session);
        this.store.cashSession.set(session);
        this.closing.set(false);
        this.successKey.set('pos.cash.success.closed');
      }
    );
  }

  private runIntent<T>(intent: CashIntent, operation: Observable<T>, onSuccess: (response: T) => void): void {
    operation
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (intent.command.cashRegisterId !== this.selectedCashRegister()?.id) {
            this.lastIntent.set(null);
            return;
          }
          onSuccess(response);
          this.lastIntent.set(null);
        },
        error: (error: unknown) =>
          this.setError(error, intent.kind === 'CLOSE' ? 'POS_CASH_CLOSE_FAILED' : 'POS_CASH_OPERATION_FAILED')
      });
  }

  private setError(error: unknown, fallbackCode: string): void {
    if (error instanceof PosOfflineStorageError) {
      this.errorCode.set(error.code);
      this.errorMessage.set(null);
      return;
    }

    if (error instanceof Error && error.message === 'OPEN_CASH_SESSION_NOT_FOUND') {
      this.errorCode.set(error.message);
      return;
    }

    if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
      this.errorCode.set(fallbackCode);
      this.errorMessage.set(error instanceof Error ? error.message : null);
      return;
    }

    const body = error.error as Record<string, unknown>;
    this.errorCode.set(typeof body['code'] === 'string' ? body['code'] : fallbackCode);
    const message = body['message'];
    this.errorMessage.set(
      typeof message === 'string'
        ? message
        : Array.isArray(message) && message.every((item) => typeof item === 'string')
          ? message.join(' · ')
          : null
    );
  }

  private clearFeedback(clearIntent = true): void {
    this.errorCode.set(null);
    this.errorMessage.set(null);
    this.successKey.set(null);
    if (clearIntent) this.lastIntent.set(null);
  }
}
