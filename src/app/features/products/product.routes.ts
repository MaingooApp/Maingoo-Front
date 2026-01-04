import { Routes } from '@angular/router';
import { ProductosComponent } from './pages/list/productos.component';
const productRoutes: Routes = [
  { path: '', component: ProductosComponent },
  { path: '**', redirectTo: '' }
];


export default productRoutes;
