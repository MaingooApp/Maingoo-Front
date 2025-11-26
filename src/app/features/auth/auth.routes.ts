import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { Login } from './login/login.component';


const authRoutes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full'},
    { path: 'login', component: Login },
    { path: 'register', component: RegisterComponent },
    {path: '**', redirectTo: 'login'},
];

export default authRoutes;