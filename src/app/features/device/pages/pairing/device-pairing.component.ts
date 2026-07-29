import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DeviceSessionService } from '../../services/device-session.service';

@Component({
  selector: 'app-device-pairing',
  standalone: true,
  template: `
    <section class="flex min-h-[calc(100vh-6.5rem)] items-center justify-center p-6">
      <div class="w-full max-w-xl rounded-content border border-surface p-6 text-center mg-surface md:p-10">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full mg-surface-muted">
          <span class="pi pi-desktop text-3xl text-primary" aria-hidden="true"></span>
        </div>
        <h1 class="m-0 text-2xl font-bold mg-text">Configurar dispositivo</h1>
        <p class="mb-0 mt-3 mg-text-muted">
          Esta pantalla se utilizará para vincular una pantalla de cocina o un terminal de camarero.
        </p>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevicePairingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly session = inject(DeviceSessionService);

  async ngOnInit(): Promise<void> {
    await this.session.initialize();
    const mode = this.session.mode();
    if (mode)
      await this.router.navigate(['/dispositivo', mode === 'KDS' ? 'cocina' : 'terminal'], { replaceUrl: true });
  }
}
