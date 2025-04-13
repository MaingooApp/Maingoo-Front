import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../core/services/auth-service.service';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, AppFloatingConfigurator, RouterModule],
})
export class RegisterComponent {
  cargando = false;

  form: any;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }


  async onSubmit() {
    if (this.form.invalid || this.form.value.password !== this.form.value.confirmPassword) {
      alert('Verifica los datos del formulario');
      return;
    }
  
    this.cargando = true;
    try {
      const { cred, negocioId } = await this.auth.register(
        this.form.value.email,
        this.form.value.password,
        true 
      );
  
      if ( negocioId) {
      localStorage.setItem('negocioId', negocioId); 
      }
  
      this.router.navigate(['/']);
    } catch (error) {
      alert('Error al registrar');
      console.error(error);
    } finally {
      this.cargando = false;
    }
  }
}