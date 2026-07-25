import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';

import { AppPermission } from '@core/constants/permissions.enum';
import { IconComponent } from '@shared/components/icon/icon.component';

interface PosNavigationCard {
  labelKey: string;
  descriptionKey: string;
  icon: string;
  route: string;
  permission: AppPermission;
}

@Component({
  selector: 'app-pos-landing',
  standalone: true,
  imports: [IconComponent, RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-landing.component.html'
})
export class PosLandingComponent {
  private readonly permissions = inject(NgxPermissionsService);

  readonly cards: PosNavigationCard[] = [
    {
      labelKey: 'pos.navigation.terminal',
      descriptionKey: 'pos.landing.terminalDescription',
      icon: 'point_of_sale',
      route: '/ventas/terminal',
      permission: AppPermission.PosSell
    },
    {
      labelKey: 'pos.navigation.kitchen',
      descriptionKey: 'pos.landing.kitchenDescription',
      icon: 'soup_kitchen',
      route: '/ventas/cocina',
      permission: AppPermission.PosKitchen
    },
    {
      labelKey: 'pos.navigation.cash',
      descriptionKey: 'pos.landing.cashDescription',
      icon: 'payments',
      route: '/ventas/caja',
      permission: AppPermission.PosCash
    },
    {
      labelKey: 'pos.navigation.history',
      descriptionKey: 'pos.landing.historyDescription',
      icon: 'receipt_long',
      route: '/ventas/historial',
      permission: AppPermission.PosRead
    },
    {
      labelKey: 'pos.navigation.settings',
      descriptionKey: 'pos.landing.settingsDescription',
      icon: 'settings',
      route: '/ventas/configuracion',
      permission: AppPermission.PosManage
    },
    {
      labelKey: 'pos.navigation.reports',
      descriptionKey: 'pos.landing.reportsDescription',
      icon: 'bar_chart',
      route: '/ventas/informes',
      permission: AppPermission.SalesReportsRead
    }
  ];

  canAccess(permission: AppPermission): boolean {
    return !!this.permissions.getPermission(permission);
  }
}
