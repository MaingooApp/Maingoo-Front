import { Routes } from '@angular/router';
import { roleGuard } from './app/core/guard/role-guard.guard';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { SupplierComponent } from './app/pages/supplier/supplier.component';
import { DocGeneratorComponent } from './app/pages/doc-generator/doc-generator.component';
import { MyProfileComponent } from './app/pages/my-profile/my-profile.component';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') },
            { path: 'facturas', loadChildren: () => import('./app/pages/facturas/invoice.routes') },
            { path: 'proveedores', component: SupplierComponent },
            { path: 'productos', loadChildren: () => import('./app/pages/productos/product.routes') },
            { path: 'docgenerator', component: DocGeneratorComponent },
            { path: 'miperfil', component: MyProfileComponent }
        ],
        canActivate: [roleGuard(['ADMIN', 'admin', 'USER'])]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
