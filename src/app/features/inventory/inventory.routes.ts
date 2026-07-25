import { Routes } from '@angular/router';

const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inventory-placeholder/inventory-placeholder.component').then(
        (m) => m.InventoryPlaceholderComponent
      )
  }
];

export default inventoryRoutes;
