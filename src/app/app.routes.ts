import { Routes } from '@angular/router';
import { roleGuard } from './core/guard/role-guard.guard';
import { AppLayout } from './layout/component/app.layout';
import { Dashboard } from './features/dashboard/dashboard.component';
import { Notfound } from './shared/components/notfound/notfound';
import { SupplierComponent } from './features/supplier/supplier.component';
import { DocGeneratorComponent } from './features/doc-generator/doc-generator.component';
import { MyProfileComponent } from './features/enterprise/pages/profile/my-profile.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', component: Dashboard },
      { path: 'uikit', loadChildren: () => import('./shared/components/uikit/uikit.routes') },
      { path: 'pages', loadChildren: () => import('./features/pages.routes') },
      { path: 'facturas', loadChildren: () => import('./features/invoices/invoice.routes') },
      { path: 'proveedores', component: SupplierComponent },
      { path: 'productos', loadChildren: () => import('./features/products/product.routes') },
      { path: 'articulos', loadChildren: () => import('./features/articles/articles.routes') },
      { path: 'docgenerator', component: DocGeneratorComponent },
      { path: 'miperfil', component: MyProfileComponent }
    ],
    canActivate: [roleGuard(['ADMIN', 'admin', 'USER'])]
  },
  { path: 'notfound', component: Notfound },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes') },
  { path: '**', redirectTo: '/notfound' }
];
