import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { PosTerminalComponent } from '../pos-terminal.component';

@Component({
  selector: 'app-pos-terminal-room',
  standalone: true,
  imports: [ButtonModule, CommonModule, DialogModule, FormsModule, InputTextModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-terminal-room.component.html'
})
export class PosTerminalRoomComponent {
  readonly terminal = inject(PosTerminalComponent);
}
