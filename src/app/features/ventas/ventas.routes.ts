import { Routes } from '@angular/router';
import { ngxPermissionsGuard } from 'ngx-permissions';
import { AppPermission } from '@core/constants/permissions.enum';
import { PosOfflineQueueService } from './services/pos-offline-queue.service';
import { PosSessionStore } from './services/pos-session.store';
import { PosSyncService } from './services/pos-sync.service';

const ventasRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/pos-shell/pos-shell.component').then((m) => m.PosShellComponent),
    providers: [PosOfflineQueueService, PosSyncService, PosSessionStore],
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
        loadComponent: () =>
          import('./pages/kitchen/kitchen-display.component').then((component) => component.KitchenDisplayComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.PosKitchen] } }
      },
      {
        path: 'caja',
        loadComponent: () =>
          import('./pages/cash/cash-management.component').then((component) => component.CashManagementComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.PosCash] } }
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./pages/history/sales-history.component').then((component) => component.SalesHistoryComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.PosRead] } }
      },
      {
        path: 'configuracion/dispositivos/emparejar',
        loadComponent: () => import('./pages/settings/pos-settings.component').then((m) => m.PosSettingsComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.PosManage] } }
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/settings/pos-settings.component').then((m) => m.PosSettingsComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.PosManage] } }
      },
      {
        path: 'informes',
        loadComponent: () =>
          import('./pages/reports/sales-reports.component').then((component) => component.SalesReportsComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.SalesReportsRead] } }
      },
      { path: '**', redirectTo: '' }
    ]
  }
];

export default ventasRoutes;
