import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-pos-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="h-full min-h-0 p-4 md:p-6">
      <main class="h-full min-h-0 overflow-y-auto rounded-content shadow-sm mg-surface">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosShellComponent {}
