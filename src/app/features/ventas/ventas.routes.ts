import { Routes } from '@angular/router';
import { ngxPermissionsGuard } from 'ngx-permissions';
import { AppPermission } from '@core/constants/permissions.enum';
import { PosSessionStore } from './services/pos-session.store';

const loadPlaceholder = () => import('./ventas.component').then((m) => m.VentasComponent);

const ventasRoutes: Routes = [
  {
    path: '',
    providers: [PosSessionStore],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/landing/pos-landing.component').then((component) => component.PosLandingComponent)
      },
      {
        path: 'terminal',
        loadComponent: () =>
          import('./pages/terminal/pos-terminal.component').then((component) => component.PosTerminalComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.PosSell] } }
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
        loadComponent: () => import('./pages/settings/pos-settings.component').then((m) => m.PosSettingsComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.PosManage] } }
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
    ]
  }
];

export default ventasRoutes;
