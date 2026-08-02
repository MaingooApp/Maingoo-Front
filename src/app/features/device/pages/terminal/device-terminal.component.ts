import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  effect,
  inject,
  signal
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { PosSessionStore } from '../../../ventas/services/pos-session.store';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';
import { TerminalPinComponent } from '../terminal-login/terminal-pin.component';

@Component({
  selector: 'app-device-terminal',
  standalone: true,
  imports: [RouterOutlet, TerminalPinComponent, TranslateModule],
  templateUrl: './device-terminal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceTerminalComponent implements OnInit {
  private readonly pairing = inject(DevicePairingService);
  private readonly posStore = inject(PosSessionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = signal(Date.now());
  private clearingExpiredOperator = false;
  readonly session = inject(DeviceSessionService);
  readonly validating = signal(true);
  readonly contextError = signal(false);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly sessionNoticeCode = signal<string | null>(null);

  private readonly operatorLifecycle = effect(() => {
    this.clock();
    this.online();
    this.session.operatorSession();
    void this.reconcileOperatorSession();
  });

  async ngOnInit(): Promise<void> {
    await this.session.initialize();
    await this.reconcileOperatorSession();
    const expiryMonitor = setInterval(() => this.clock.set(Date.now()), 1_000);
    this.destroyRef.onDestroy(() => clearInterval(expiryMonitor));
    await this.validate();
  }

  async validate(): Promise<void> {
    if (this.session.mode() !== 'REGISTER') {
      await this.router.navigate(['/dispositivo']);
      return;
    }

    this.validating.set(true);
    this.contextError.set(false);
    if (!this.online()) {
      this.validating.set(false);
      return;
    }
    try {
      const context = await firstValueFrom(this.pairing.getContext());
      if (context.device.type !== 'REGISTER') {
        await this.router.navigate(['/dispositivo']);
        return;
      }
      await this.session.applyDeviceContext(context);
    } catch {
      this.contextError.set(true);
    } finally {
      this.validating.set(false);
    }
  }

  @HostListener('window:online')
  handleOnline(): void {
    this.online.set(true);
    void this.reconcileOperatorSession();
  }

  @HostListener('window:offline')
  handleOffline(): void {
    this.online.set(false);
    void this.reconcileOperatorSession();
  }

  async reconcileOperatorSession(): Promise<void> {
    const operator = this.session.operatorSession();
    this.posStore.bindEmployee(operator?.user.id ?? null);
    if (!operator) {
      this.sessionNoticeCode.set(null);
      this.clearExpiryBlock();
      return;
    }

    const expiry = Date.parse(operator.expiresAt);
    if (Number.isFinite(expiry) && expiry > this.clock()) {
      this.sessionNoticeCode.set(null);
      this.clearExpiryBlock();
      return;
    }

    if (!this.online()) {
      this.sessionNoticeCode.set('EMPLOYEE_SESSION_EXPIRED_OFFLINE');
      this.posStore.setMutationBlock('EMPLOYEE_SESSION_EXPIRED_OFFLINE');
      return;
    }

    this.sessionNoticeCode.set('EMPLOYEE_SESSION_EXPIRED');
    this.posStore.setMutationBlock('EMPLOYEE_SESSION_EXPIRED');
    if (this.clearingExpiredOperator) return;
    this.clearingExpiredOperator = true;
    try {
      await this.session.clearOperatorSession();
    } finally {
      this.clearingExpiredOperator = false;
    }
  }

  private clearExpiryBlock(): void {
    if (
      this.posStore.mutationBlockCode() === 'EMPLOYEE_SESSION_EXPIRED' ||
      this.posStore.mutationBlockCode() === 'EMPLOYEE_SESSION_EXPIRED_OFFLINE'
    ) {
      this.posStore.setMutationBlock(null);
    }
  }
}
