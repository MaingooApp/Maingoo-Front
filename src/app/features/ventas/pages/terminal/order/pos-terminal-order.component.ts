import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { PosTerminalComponent } from '../pos-terminal.component';

@Component({
  selector: 'app-pos-terminal-order',
  standalone: true,
  imports: [ButtonModule, CommonModule, DialogModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-terminal-order.component.html'
})
export class PosTerminalOrderComponent {
  readonly terminal = inject(PosTerminalComponent);

  constructor() {
    const route = inject(ActivatedRoute);
    const destroyRef = inject(DestroyRef);

    route.paramMap.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
      this.terminal.store.selectOrder(params.get('orderId'));
    });
  }
}
