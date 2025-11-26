import { Routes } from '@angular/router';
import { roleGuard } from './core/guard/role-guard.guard';
import { AppLayout } from './layout/component/app.layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Landing } from './pages/landing/landing';
import { Notfound } from './pages/notfound/notfound';
import { SupplierComponent } from './pages/supplier/supplier.component';
import { DocGeneratorComponent } from './pages/doc-generator/doc-generator.component';
import { MyProfileComponent } from './pages/my-profile/my-profile.component';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./pages/uikit/uikit.routes') },
            { path: 'pages', loadChildren: () => import('./pages/pages.routes') },
            { path: 'facturas', loadChildren: () => import('./pages/facturas/invoice.routes') },
            { path: 'proveedores', component: SupplierComponent },
            { path: 'productos', loadChildren: () => import('./pages/productos/product.routes') },
            { path: 'docgenerator', component: DocGeneratorComponent },
            { path: 'miperfil', component: MyProfileComponent }
        ],
        canActivate: [roleGuard(['ADMIN', 'admin', 'USER'])]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
