import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';

@Component({
  selector: 'app-terminal-pin',
  standalone: true,
  templateUrl: './terminal-pin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TerminalPinComponent {
  private readonly pairing = inject(DevicePairingService);
  private readonly session = inject(DeviceSessionService);
  private lockTimer: ReturnType<typeof setInterval> | null = null;

  readonly pin = signal('');
  readonly submitting = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly lockRemainingSeconds = signal(0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopLockTimer());
  }

  append(digit: string): void {
    if (this.submitting() || this.lockRemainingSeconds() || this.pin().length >= 6) return;
    this.pin.update((pin) => `${pin}${digit}`);
    this.errorCode.set(null);
  }

  removeLast(): void {
    if (this.submitting() || this.lockRemainingSeconds()) return;
    this.pin.update((pin) => pin.slice(0, -1));
  }

  setPin(value: string): void {
    this.pin.set(value.replace(/\D/g, '').slice(0, 6));
    this.errorCode.set(null);
  }

  onInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.setPin(event.target.value);
  }

  async submit(): Promise<void> {
    const pin = this.pin();
    if (!/^\d{4,6}$/.test(pin) || this.submitting() || this.lockRemainingSeconds()) return;

    this.submitting.set(true);
    this.errorCode.set(null);
    this.pin.set('');
    try {
      const operator = await firstValueFrom(this.pairing.createEmployeeSession(pin));
      await this.session.setOperatorSession(operator);
    } catch (error: unknown) {
      const code = extractErrorCode(error);
      this.errorCode.set(code === 'EMPLOYEE_PIN_LOCKED' ? code : 'EMPLOYEE_PIN_INVALID');
      if (code === 'EMPLOYEE_PIN_LOCKED') this.startLock(extractRetrySeconds(error));
    } finally {
      this.pin.set('');
      this.submitting.set(false);
    }
  }

  private startLock(seconds: number): void {
    this.stopLockTimer();
    this.lockRemainingSeconds.set(seconds);
    if (!seconds) return;

    this.lockTimer = setInterval(() => {
      const remaining = this.lockRemainingSeconds() - 1;
      this.lockRemainingSeconds.set(Math.max(0, remaining));
      if (remaining <= 0) this.stopLockTimer();
    }, 1000);
  }

  private stopLockTimer(): void {
    if (this.lockTimer) clearInterval(this.lockTimer);
    this.lockTimer = null;
  }
}

function extractErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return null;
  const body = error.error as Record<string, unknown>;
  return typeof body['code'] === 'string' ? body['code'] : null;
}

function extractRetrySeconds(error: unknown): number {
  if (!(error instanceof HttpErrorResponse)) return 0;
  const header = Number(error.headers.get('Retry-After'));
  if (Number.isFinite(header) && header > 0) return Math.ceil(header);
  if (!error.error || typeof error.error !== 'object') return 0;

  const body = error.error as Record<string, unknown>;
  const retryAfterSeconds = Number(body['retryAfterSeconds']);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) return Math.ceil(retryAfterSeconds);
  const lockedUntil = typeof body['lockedUntil'] === 'string' ? Date.parse(body['lockedUntil']) : NaN;
  return Number.isFinite(lockedUntil) ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
}
