import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { AuthService } from '../../../core/services/auth-service.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule,
         CheckboxModule, 
         InputTextModule, 
         PasswordModule, 
         FormsModule, 
         RouterModule, 
         RippleModule, 
         AppFloatingConfigurator,
         ReactiveFormsModule
        ],
    templateUrl: './login.component.html',
})
export class Login {
    loginForm!: FormGroup;
    cargando = false;
    checked = false;
  
    constructor(
      private fb: FormBuilder,
      private authService: AuthService,
      private router: Router
    ) {}
  
    ngOnInit(): void {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
        rememberMe: [false] 
      });
    }
  
    async onSubmit() {
        console.log(this.loginForm.value);
        
      if (this.loginForm.invalid) return;
      this.cargando = true;
  
      const { email, password } = this.loginForm.value;
  
      try {
        const cred = await this.authService.login(email, password);
        const rol = await this.authService.getUserRole(cred.user.uid);
  
        if (rol === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } catch (error) {
        console.error(error);
        alert('Error al iniciar sesión. Verifica tus credenciales.');
      } finally {
        this.cargando = false;
      }
    }
}
