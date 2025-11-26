import { Routes } from '@angular/router';
import { Empty } from '../shared/components/empty/empty';
import { Crud } from '../shared/components/crud/crud';

export default [
    { path: 'crud', component: Crud },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
