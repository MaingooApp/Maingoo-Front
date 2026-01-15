import { Routes } from '@angular/router';
import { Empty } from '../shared/components/empty/empty';

export default [
  { path: 'empty', component: Empty },
  { path: '**', redirectTo: '/notfound' }
] as Routes;
