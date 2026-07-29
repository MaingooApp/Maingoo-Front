import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PosTerminalComponent } from '../../../ventas/pages/terminal/pos-terminal.component';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';
import { TerminalPinComponent } from '../terminal-login/terminal-pin.component';

@Component({
  selector: 'app-device-terminal',
  standalone: true,
  imports: [PosTerminalComponent, TerminalPinComponent],
  template: `
    @if (validating()) {
      <div class="flex min-h-[calc(100vh-10rem)] items-center justify-center" role="status">
        <span class="pi pi-spin pi-spinner text-3xl text-primary" aria-label="Validando terminal"></span>
      </div>
    } @else if (contextError()) {
      <div class="flex min-h-[calc(100vh-10rem)] items-center justify-center p-6 text-center">
        <div>
          <p class="mg-text">No se ha podido validar este terminal.</p>
          <button type="button" class="min-h-11 rounded-lg bg-primary px-5 text-primary-contrast" (click)="validate()">
            Reintentar
          </button>
        </div>
      </div>
    } @else if (session.hasActiveOperator()) {
      <app-pos-terminal />
    } @else {
      <app-terminal-pin />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceTerminalComponent implements OnInit {
  private readonly pairing = inject(DevicePairingService);
  private readonly router = inject(Router);
  readonly session = inject(DeviceSessionService);
  readonly validating = signal(true);
  readonly contextError = signal(false);

  async ngOnInit(): Promise<void> {
    await this.session.initialize();
    await this.validate();
  }

  async validate(): Promise<void> {
    if (this.session.mode() !== 'REGISTER') {
      await this.router.navigate(['/dispositivo']);
      return;
    }

    this.validating.set(true);
    this.contextError.set(false);
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
}
