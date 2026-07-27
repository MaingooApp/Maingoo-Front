import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';

import { AppPermission } from '@core/constants/permissions.enum';

import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';

@Component({
  selector: 'app-inventory-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  providers: [InventoryConnectivityService],
  templateUrl: './inventory-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryShellComponent {
  private readonly permissions = inject(NgxPermissionsService);
  readonly connectivity = inject(InventoryConnectivityService);
  readonly canWrite = !!this.permissions.getPermission(AppPermission.InventoryWrite);
}
