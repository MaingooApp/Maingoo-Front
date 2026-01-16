import { Routes } from '@angular/router';
import { ProductosComponent } from './productos.component';
const productRoutes: Routes = [
  { path: '', component: ProductosComponent },
  { path: '**', redirectTo: '' }
];


export default productRoutes;
