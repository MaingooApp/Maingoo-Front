import { Routes } from '@angular/router';
import { authGuard } from './core/guard/auth.guard';
import { AppLayout } from './layout/component/app.layout';
import { Dashboard } from './features/dashboard/dashboard.component';
import { Notfound } from './shared/components/notfound/notfound';
import { SupplierComponent } from './features/supplier/supplier.component';
import { DocGeneratorComponent } from './features/fiscal/fiscal.component';
import { MyProfileComponent } from './features/enterprise/pages/profile/my-profile.component';
import { ngxPermissionsGuard } from 'ngx-permissions';
import { AppPermission } from './core/constants/permissions.enum';

export const appRoutes: Routes = [
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      { path: '', component: Dashboard },

      { path: 'pages', loadChildren: () => import('./features/pages.routes') },
      {
        path: 'facturas',
        loadChildren: () => import('./features/invoices/invoice.routes'),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.InvoicesRead] } }
      },
      {
        path: 'proveedores',
        component: SupplierComponent,
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.SuppliersRead] } }
      },
      {
        path: 'productos',
        loadChildren: () => import('./features/products/product.routes'),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.ProductsRead] } }
      },
      {
        path: 'articulos',
        loadChildren: () => import('./features/articles/articles.routes'),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.ProductsRead] } }
      },
      { path: 'gestoria', component: DocGeneratorComponent },
      { path: 'appcc', loadComponent: () => import('./features/appcc/appcc.component').then((m) => m.AppccComponent) },
      { path: 'rrhh', loadComponent: () => import('./features/rrhh/rrhh.component').then((m) => m.RrhhComponent) },
      { path: 'miperfil', component: MyProfileComponent },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
        canActivate: [ngxPermissionsGuard],
        data: { permissions: { only: [AppPermission.UsersRead, AppPermission.PermissionsAssign] } }
      },
      {
        path: 'ventas',
        loadComponent: () => import('./features/ventas/ventas.component').then((m) => m.VentasComponent)
      }
    ]
  },
  { path: 'notfound', component: Notfound },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes') },
  { path: '**', redirectTo: '/notfound' }
];
