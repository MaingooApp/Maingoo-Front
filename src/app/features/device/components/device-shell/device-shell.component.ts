import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DeviceSessionService } from '../../services/device-session.service';

@Component({
  selector: 'app-device-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-surface-50 p-4 dark:bg-surface-950 md:p-6">
      <header class="mx-auto mb-4 flex max-w-screen-2xl items-center justify-between gap-4" aria-label="Maingoo TPV">
        <div class="flex items-center gap-3">
          <img src="assets/images/maingoo_logo.svg" alt="Maingoo" class="h-10 w-10 object-contain" />
          <span class="text-lg font-semibold mg-text">Maingoo TPV</span>
        </div>
        @if (session.device(); as device) {
          <div class="flex min-w-0 items-center gap-3 text-right">
            <div class="min-w-0">
              <p class="m-0 truncate text-sm font-semibold mg-text" [title]="device.name">{{ device.name }}</p>
              <p class="m-0 text-xs mg-text-muted">{{ device.type === 'KDS' ? 'Pantalla de cocina' : 'Terminal' }}</p>
            </div>
            <span class="inline-flex items-center gap-2 text-sm mg-text-muted" role="status" aria-live="polite">
              <span
                class="h-2.5 w-2.5 rounded-full"
                [class.bg-green-500]="online()"
                [class.bg-red-500]="!online()"
                aria-hidden="true"></span>
              {{ online() ? 'Online' : 'Sin conexión' }}
            </span>
          </div>
        }
      </header>
      <main class="mx-auto min-h-[calc(100vh-6.5rem)] max-w-screen-2xl rounded-content shadow-sm mg-surface">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceShellComponent {
  readonly session = inject(DeviceSessionService);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);

  @HostListener('window:online')
  setOnline(): void {
    this.online.set(true);
  }

  @HostListener('window:offline')
  setOffline(): void {
    this.online.set(false);
  }
}
