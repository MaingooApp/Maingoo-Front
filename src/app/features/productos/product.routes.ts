import { Routes } from '@angular/router';
import { ProductosComponent } from './productos.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';

const productRoutes: Routes = [
    { path: '', component: ProductosComponent },
    { path: 'detalle/:id', component: ProductDetailComponent },
    { path: '**', redirectTo: '' }
];

export default productRoutes;
