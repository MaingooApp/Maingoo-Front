import { Routes } from '@angular/router';
import { ngxPermissionsGuard } from 'ngx-permissions';
import { AppPermission } from '@core/constants/permissions.enum';

const loadPlaceholder = () => import('./ventas.component').then((m) => m.VentasComponent);

const ventasRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: loadPlaceholder,
    data: { titleKey: 'pos.navigation.sales' }
  },
  {
    path: 'terminal',
    loadComponent: loadPlaceholder,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: { only: [AppPermission.PosSell] },
      titleKey: 'pos.navigation.terminal'
    }
  },
  {
    path: 'cocina',
    loadComponent: loadPlaceholder,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: { only: [AppPermission.PosKitchen] },
      titleKey: 'pos.navigation.kitchen'
    }
  },
  {
    path: 'caja',
    loadComponent: loadPlaceholder,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: { only: [AppPermission.PosCash] },
      titleKey: 'pos.navigation.cash'
    }
  },
  {
    path: 'historial',
    loadComponent: loadPlaceholder,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: { only: [AppPermission.PosRead] },
      titleKey: 'pos.navigation.history'
    }
  },
  {
    path: 'configuracion',
    loadComponent: loadPlaceholder,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: { only: [AppPermission.PosManage] },
      titleKey: 'pos.navigation.settings'
    }
  },
  {
    path: 'informes',
    loadComponent: loadPlaceholder,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: { only: [AppPermission.SalesReportsRead] },
      titleKey: 'pos.navigation.reports'
    }
  },
  { path: '**', redirectTo: '' }
];

export default ventasRoutes;
