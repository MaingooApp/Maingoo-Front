import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';

import {
  DeviceMode,
  DevicePairingChallenge,
  DevicePairingExchange,
  DevicePairingExchangeSuccess
} from '../../models/device-session.models';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';

@Component({
  selector: 'app-device-pairing',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './device-pairing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevicePairingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly pairingService = inject(DevicePairingService);
  private readonly session = inject(DeviceSessionService);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private pollIntervalSeconds = 5;
  private qrRequestId = 0;
  private destroyed = false;

  readonly selectedMode = signal<DeviceMode | null>(null);
  readonly challenge = signal<DevicePairingChallenge | null>(null);
  readonly qrDataUrl = signal<string | null>(null);
  readonly remainingSeconds = signal(0);
  readonly busy = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly countdown = computed(() => formatDuration(this.remainingSeconds()));
  requestedLabel = '';

  async ngOnInit(): Promise<void> {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    await this.session.initialize();
    if (this.destroyed) return;

    const mode = this.session.mode();
    if (mode) {
      await this.openDevice(mode);
      return;
    }

    const pending = this.session.pendingPairing();
    if (pending) this.activateChallenge(pending);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.stopTimers();
  }

  selectMode(mode: DeviceMode): void {
    this.selectedMode.set(mode);
    this.errorCode.set(null);
  }

  async createPairing(): Promise<void> {
    const requestedType = this.selectedMode();
    if (!requestedType || this.busy()) return;

    this.busy.set(true);
    this.errorCode.set(null);
    try {
      const requestedLabel = this.requestedLabel.trim();
      const challenge = await firstValueFrom(
        this.pairingService.create({
          requestedType,
          ...(requestedLabel ? { requestedLabel } : {})
        })
      );
      await this.session.setPendingPairing(challenge);
      if (!this.destroyed) this.activateChallenge(challenge);
    } catch (error: unknown) {
      this.errorCode.set(readErrorCode(error));
    } finally {
      this.busy.set(false);
    }
  }

  async cancelPairing(): Promise<void> {
    this.challenge.set(null);
    this.qrDataUrl.set(null);
    this.errorCode.set(null);
    this.stopTimers();
    await this.session.clearPendingPairing();
  }

  errorMessage(): string {
    switch (this.errorCode()) {
      case 'PAIRING_DENIED':
        return 'La solicitud fue rechazada. Genera un código nuevo para intentarlo otra vez.';
      case 'PAIRING_EXPIRED':
      case 'PAIRING_ALREADY_CONSUMED':
      case 'PAIRING_CODE_INVALID':
        return 'El código ya no es válido. Genera uno nuevo para continuar.';
      case 'DEVICE_SESSION_STORAGE_FAILED':
      case 'DEVICE_SESSION_STORAGE_UNAVAILABLE':
        return 'No se pudo guardar la vinculación en este dispositivo.';
      default:
        return 'No se pudo conectar con Maingoo. Comprueba la conexión e inténtalo de nuevo.';
    }
  }

  private activateChallenge(challenge: DevicePairingChallenge): void {
    this.stopTimers();
    this.challenge.set(challenge);
    this.pollIntervalSeconds = Math.max(1, challenge.pollIntervalSeconds);
    this.errorCode.set(null);
    this.updateRemaining();
    this.renderQr(challenge.verificationUriComplete);
    this.countdownTimer = setInterval(() => this.updateRemaining(), 1_000);
    this.schedulePoll();
  }

  private schedulePoll(delaySeconds = this.pollIntervalSeconds): void {
    this.clearPollTimer();
    if (this.destroyed || document.hidden || !this.challenge()) return;
    this.pollTimer = setTimeout(() => void this.poll(), delaySeconds * 1_000);
  }

  private async poll(): Promise<void> {
    this.pollTimer = null;
    const challenge = this.challenge();
    if (!challenge || this.destroyed || document.hidden) return;

    try {
      const result = await firstValueFrom(this.pairingService.exchange(challenge.deviceCode));
      if (this.destroyed || this.challenge()?.pairingId !== challenge.pairingId) return;

      if (isPairingPending(result)) {
        this.pollIntervalSeconds = Math.max(1, result.pollIntervalSeconds);
        this.schedulePoll();
        return;
      }

      await this.completePairing(result);
    } catch (error: unknown) {
      if (this.destroyed || this.challenge()?.pairingId !== challenge.pairingId) return;
      const code = readErrorCode(error);
      if (code === 'PAIRING_SLOW_DOWN') {
        this.pollIntervalSeconds = Math.min(60, this.pollIntervalSeconds + 5);
        this.schedulePoll();
      } else if (isTerminalPairingError(code)) {
        await this.expireChallenge(code);
      } else {
        this.errorCode.set(code);
        this.schedulePoll();
      }
    }
  }

  private async completePairing(identity: DevicePairingExchangeSuccess): Promise<void> {
    this.stopTimers();
    await this.session.setPairedIdentity(identity);
    if (!this.destroyed) await this.openDevice(identity.mode);
  }

  private async expireChallenge(code: string): Promise<void> {
    this.challenge.set(null);
    this.qrDataUrl.set(null);
    this.errorCode.set(code);
    this.stopTimers();
    await this.session.clearPendingPairing();
  }

  private updateRemaining(): void {
    const challenge = this.challenge();
    if (!challenge) return;
    const seconds = Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - Date.now()) / 1_000));
    this.remainingSeconds.set(seconds);
    if (seconds === 0) void this.expireChallenge('PAIRING_EXPIRED');
  }

  private renderQr(value: string): void {
    const requestId = ++this.qrRequestId;
    this.qrDataUrl.set(null);
    void QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 240 })
      .then((url) => {
        if (!this.destroyed && requestId === this.qrRequestId) this.qrDataUrl.set(url);
      })
      .catch(() => {
        if (!this.destroyed && requestId === this.qrRequestId) this.qrDataUrl.set(null);
      });
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.clearPollTimer();
    else if (this.challenge()) this.schedulePoll();
  };

  private stopTimers(): void {
    this.clearPollTimer();
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }

  private clearPollTimer(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  private openDevice(mode: DeviceMode): Promise<boolean> {
    return this.router.navigate(['/dispositivo', mode === 'KDS' ? 'cocina' : 'terminal'], { replaceUrl: true });
  }
}

function isPairingPending(result: DevicePairingExchange): result is Extract<DevicePairingExchange, { code: string }> {
  return 'code' in result && result.code === 'PAIRING_PENDING';
}

function isTerminalPairingError(code: string): boolean {
  return ['PAIRING_DENIED', 'PAIRING_EXPIRED', 'PAIRING_ALREADY_CONSUMED', 'PAIRING_CODE_INVALID'].includes(code);
}

function readErrorCode(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    const code = (error.error as Record<string, unknown>)['code'];
    if (typeof code === 'string') return code;
  }
  return 'PAIRING_CONNECTION_ERROR';
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}
