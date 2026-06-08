import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AppFloatingConfigurator } from '../../../../layout/component/floating-configurator/app.floatingconfigurator';
import { AuthService } from '../../services/auth-service.service';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, AppFloatingConfigurator, RouterModule]
})
export class RegisterComponent {
  private destroyRef = inject(DestroyRef);

  cargando = false;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
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

    this.auth
      .register(this.form.value.email, this.form.value.password, 'Nuevo Usuario')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.user.enterpriseId) {
            localStorage.setItem('enterpriseId', response.user.enterpriseId);
          }

          alert('Registro exitoso. Redirigiendo...');
          this.router.navigate(['/']);
          this.cargando = false;
        },
        error: () => {
          alert('Error al registrar');
          this.cargando = false;
        }
      });
  }
}
