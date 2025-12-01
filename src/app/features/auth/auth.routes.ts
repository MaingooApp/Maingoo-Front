import { Routes } from '@angular/router';
import { Login } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';

const authRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: 'login' }
];

export default authRoutes;
