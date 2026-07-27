import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Observable, finalize, from, fromEvent, map, merge, of, switchMap, throwError } from 'rxjs';

import { AuthService } from '@features/auth/services/auth-service.service';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';

import {
  CloseCashSessionCommandData,
  CreateCashMovementCommandData,
  OpenCashSessionCommandData
} from '../../models/pos-command.models';
import { CashSessionWithMovements, PosDevice } from '../../models/pos.models';
import {
  CachedPosDevice,
  PosOfflineQueueService,
  PosOfflineStorageError
} from '../../services/pos-offline-queue.service';
import { PosService } from '../../services/pos.service';

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
  imports: [ButtonModule, CommonModule, FormsModule, InputTextModule, RouterLink, SkeletonComponent, TranslateModule],
  templateUrl: './cash-management.component.html',
  styleUrl: './cash-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashManagementComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly offlineQueue = inject(PosOfflineQueueService);
  private readonly posService = inject(PosService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);
  private deviceLoadVersion = 0;
  private sessionLoadVersion = 0;

  readonly devices = signal<PosDevice[]>([]);
  readonly selectedDeviceId = signal('');
  readonly session = signal<CashSessionWithMovements | null>(null);
  readonly loadingDevices = signal(true);
  readonly loadingSession = signal(false);
  readonly submitting = signal(false);
  readonly confirming = signal(false);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly deviceLoadFailed = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successKey = signal<string | null>(null);
  readonly closing = signal(false);
  readonly lastIntent = signal<CashIntent | null>(null);

  selectedDevice(): PosDevice | null {
    const enterpriseId = this.authService.getEnterpriseId();
    return (
      this.devices().find(
        ({ id, enterpriseId: deviceEnterpriseId }) =>
          id === this.selectedDeviceId() && deviceEnterpriseId === enterpriseId
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

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      merge(fromEvent(window, 'online').pipe(map(() => true)), fromEvent(window, 'offline').pipe(map(() => false)))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((online) => this.online.set(online));
    }

    this.loadDevices();
  }

  loadDevices(): void {
    const version = ++this.deviceLoadVersion;
    ++this.sessionLoadVersion;
    const enterpriseId = this.authService.getEnterpriseId();
    this.loadingDevices.set(true);
    this.deviceLoadFailed.set(false);
    this.devices.set([]);
    this.selectedDeviceId.set('');
    this.session.set(null);
    this.clearFeedback();

    if (!enterpriseId) {
      this.loadingDevices.set(false);
      this.deviceLoadFailed.set(true);
      this.setError(new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_REQUIRED'), 'POS_DEVICE_LOAD_FAILED');
      return;
    }

    from(this.cachedDevice(enterpriseId))
      .pipe(
        switchMap((cachedDevice) =>
          this.posService
            .listDevices({ type: 'REGISTER', status: 'ACTIVE' })
            .pipe(map((devices) => ({ cachedDevice, devices })))
        ),
        finalize(() => {
          if (version === this.deviceLoadVersion) this.loadingDevices.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ cachedDevice, devices }) => {
          if (version !== this.deviceLoadVersion || this.authService.getEnterpriseId() !== enterpriseId) return;
          this.devices.set(
            devices.filter(
              ({ enterpriseId: deviceEnterpriseId, type, status }) =>
                deviceEnterpriseId === enterpriseId && type === 'REGISTER' && status === 'ACTIVE'
            )
          );
          if (cachedDevice && this.devices().some(({ id }) => id === cachedDevice.deviceId)) {
            this.activateDevice(cachedDevice.deviceId, false);
          }
        },
        error: (error: unknown) => {
          if (version !== this.deviceLoadVersion) return;
          this.deviceLoadFailed.set(true);
          this.setError(error, 'POS_DEVICE_LOAD_FAILED');
        }
      });
  }

  selectDevice(deviceId: string): void {
    if (this.busy()) return;

    this.activateDevice(deviceId, true);
  }

  private activateDevice(deviceId: string, persist: boolean): void {
    ++this.sessionLoadVersion;
    const enterpriseId = this.authService.getEnterpriseId();
    const device = this.devices().find(
      ({ id, enterpriseId: deviceEnterpriseId, status, type }) =>
        id === deviceId && deviceEnterpriseId === enterpriseId && status === 'ACTIVE' && type === 'REGISTER'
    );

    this.selectedDeviceId.set(device?.id ?? '');
    this.session.set(null);
    this.closing.set(false);
    this.lastIntent.set(null);
    this.clearFeedback();

    if (!device) return;

    if (!persist) {
      this.loadCurrentSession();
      return;
    }

    void this.offlineQueue
      .saveDevice(device)
      .then(() => {
        if (this.selectedDeviceId() === device.id && this.authService.getEnterpriseId() === device.enterpriseId) {
          this.loadCurrentSession();
        }
      })
      .catch((error: unknown) => {
        if (this.selectedDeviceId() === device.id) this.selectedDeviceId.set('');
        this.setError(error, 'POS_DEVICE_SELECTION_FAILED');
      });
  }

  loadCurrentSession(): void {
    const deviceId = this.selectedDevice()?.id;
    const enterpriseId = this.authService.getEnterpriseId();
    if (!deviceId) return;

    const version = ++this.sessionLoadVersion;
    this.loadingSession.set(true);
    this.clearFeedback();
    this.posService
      .getCurrentCashSession(deviceId)
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
            this.selectedDevice()?.id !== deviceId
          ) {
            return;
          }
          if (session && (session.enterpriseId !== enterpriseId || session.deviceId !== deviceId)) {
            this.session.set(null);
            this.setError(new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_MISMATCH'), 'POS_CASH_LOAD_FAILED');
            return;
          }
          this.session.set(session);
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
    const deviceId = this.selectedDevice()?.id;
    if (!deviceId || !this.online() || !this.openingAmountValid() || !(await this.confirm('open'))) return;

    this.executeIntent({
      kind: 'OPEN',
      key: crypto.randomUUID(),
      command: { deviceId, openingAmount: this.openingAmount, clientCreatedAt: new Date().toISOString() }
    });
  }

  async createMovement(): Promise<void> {
    const current = this.session();
    if (
      current?.status !== 'OPEN' ||
      current.enterpriseId !== this.authService.getEnterpriseId() ||
      current.deviceId !== this.selectedDevice()?.id ||
      !this.online() ||
      !this.movementAmountValid() ||
      !this.movementReasonValid() ||
      !(await this.confirm('movement'))
    ) {
      return;
    }

    this.executeIntent({
      kind: 'MOVEMENT',
      key: crypto.randomUUID(),
      sessionId: current.id,
      command: {
        deviceId: current.deviceId,
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
      current.deviceId !== this.selectedDevice()?.id ||
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
      current.deviceId !== this.selectedDevice()?.id ||
      !this.online() ||
      !this.countedCashValid() ||
      !(await this.confirm('close'))
    ) {
      return;
    }

    this.executeIntent({
      kind: 'CLOSE',
      key: crypto.randomUUID(),
      sessionId: current.id,
      command: {
        deviceId: current.deviceId,
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
    if (this.busy() || intent.command.deviceId !== this.selectedDevice()?.id) return;

    this.lastIntent.set(intent);
    this.submitting.set(true);
    this.clearFeedback(false);

    if (intent.kind === 'OPEN') {
      this.runIntent(intent, this.posService.openCashSession(intent.command, intent.key), (session) => {
        this.session.set(session);
        this.openingAmount = '';
        this.successKey.set('pos.cash.success.opened');
      });
      return;
    }

    if (intent.kind === 'MOVEMENT') {
      const operation = this.posService.createCashMovement(intent.sessionId, intent.command, intent.key).pipe(
        switchMap(() => this.posService.getCurrentCashSession(intent.command.deviceId)),
        switchMap((session) => (session ? of(session) : throwError(() => new Error('OPEN_CASH_SESSION_NOT_FOUND'))))
      );
      this.runIntent(intent, operation, (session) => {
        this.session.set(session);
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
          if (intent.command.deviceId !== this.selectedDevice()?.id) {
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

  private async cachedDevice(enterpriseId: string): Promise<CachedPosDevice | null> {
    await this.offlineQueue.useEnterprise(enterpriseId);
    const device = await this.offlineQueue.getDevice();
    if (
      this.authService.getEnterpriseId() !== enterpriseId ||
      this.offlineQueue.currentEnterpriseId() !== enterpriseId ||
      (device !== null && device.enterpriseId !== enterpriseId)
    ) {
      throw new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_MISMATCH');
    }
    return device;
  }
}
