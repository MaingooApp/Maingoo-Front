import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { DeviceSessionService } from '../../services/device-session.service';

@Component({
  selector: 'app-device-revoked',
  standalone: true,
  template: `
    <section class="flex min-h-[calc(100vh-6.5rem)] items-center justify-center p-6">
      <div class="w-full max-w-xl rounded-content border border-surface p-6 text-center mg-surface md:p-10">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
          <span class="pi pi-lock text-3xl text-red-600 dark:text-red-400" aria-hidden="true"></span>
        </div>
        <h1 class="m-0 text-2xl font-bold mg-text">Dispositivo desvinculado</h1>
        <p class="mb-6 mt-3 mg-text-muted">
          La credencial de este equipo ya no es válida. Un responsable debe volver a emparejarlo para continuar.
        </p>
        <button
          type="button"
          class="min-h-11 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-contrast hover:bg-primary-emphasis disabled:opacity-60"
          [disabled]="clearing()"
          (click)="rePair()">
          {{ clearing() ? 'Preparando…' : 'Volver a emparejar' }}
        </button>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceRevokedComponent {
  private readonly router = inject(Router);
  private readonly session = inject(DeviceSessionService);
  readonly clearing = signal(false);

  async rePair(): Promise<void> {
    if (this.clearing()) return;
    this.clearing.set(true);
    await this.session.clear().catch(() => undefined);
    await this.router.navigate(['/dispositivo']);
  }
}
