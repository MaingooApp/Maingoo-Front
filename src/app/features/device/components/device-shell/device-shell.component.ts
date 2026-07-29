import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-device-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-surface-50 p-4 dark:bg-surface-950 md:p-6">
      <header class="mx-auto mb-4 flex max-w-screen-2xl items-center gap-3" aria-label="Maingoo TPV">
        <img src="assets/images/maingoo_logo.svg" alt="Maingoo" class="h-10 w-10 object-contain" />
        <span class="text-lg font-semibold mg-text">Maingoo TPV</span>
      </header>
      <main class="mx-auto min-h-[calc(100vh-6.5rem)] max-w-screen-2xl rounded-content shadow-sm mg-surface">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceShellComponent {}
