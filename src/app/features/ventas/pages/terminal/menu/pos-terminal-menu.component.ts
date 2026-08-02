import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { PosTerminalComponent } from '../pos-terminal.component';

@Component({
  selector: 'app-pos-terminal-menu',
  standalone: true,
  imports: [ButtonModule, CommonModule, DialogModule, FormsModule, InputTextModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-terminal-menu.component.html'
})
export class PosTerminalMenuComponent {
  readonly terminal = inject(PosTerminalComponent);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.terminal.store.selectOrder(params.get('orderId'));
    });
  }
}
