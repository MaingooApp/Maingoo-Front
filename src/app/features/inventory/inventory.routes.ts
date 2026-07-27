import { Routes } from '@angular/router';
import { ngxPermissionsGuard } from 'ngx-permissions';

import { AppPermission } from '@core/constants/permissions.enum';

const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/inventory-shell/inventory-shell.component').then((m) => m.InventoryShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/stock-summary/stock-summary.component').then((m) => m.StockSummaryComponent)
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./pages/stock-movements/stock-movements.component').then((m) => m.StockMovementsComponent)
      },
      {
        path: 'recuento',
        loadComponent: () => import('./pages/stock-count/stock-count.component').then((m) => m.StockCountComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.InventoryWrite] } }
      },
      { path: '**', redirectTo: '' }
    ]
  }
];

export default inventoryRoutes;
