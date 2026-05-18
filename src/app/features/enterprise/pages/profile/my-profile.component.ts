import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { FluidModule } from 'primeng/fluid';
import { PasswordModule } from 'primeng/password';
import { PopoverModule } from 'primeng/popover';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CreateEnterpriseDto, Enterprise, EnterpriseService } from '../../services/enterprise.service';
import { AuthService } from '../../../auth/services/auth-service.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputMaskModule,
    ButtonModule,
    CardModule,
    FluidModule,
    PasswordModule,
    PopoverModule,
    TabViewModule,
    TabViewModule,
    ToastModule,
    IconComponent,
    NgxPermissionsModule
  ],
  providers: [MessageService],
  templateUrl: './my-profile.component.html'
})
export class MyProfileComponent {
  readonly P = AppPermission;
  perfilForm!: FormGroup;
  passwordForm!: FormGroup;
  currentEnterprise?: Enterprise;
  private destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private enterpriseService: EnterpriseService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.perfilForm = this.fb.group({
      type: ['RESTAURANT', Validators.required], // RESTAURANT, CATERING, HOTEL, OTHER
      name: ['', Validators.required],
      cifNif: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      country: ['España', Validators.required],
      city: ['', Validators.required],
      address: ['', Validators.required],
      postalCode: ['', Validators.required],
      firstPhonePrefix: ['+34', Validators.required],
      firstPhoneNumber: ['', Validators.required],
      secondPhonePrefix: ['+34'],
      secondPhoneNumber: [''],
      iban: ['']
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, this.passwordPolicyValidator()]],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordMatchValidator() }
    );

    this.cargarPerfil();
  }

  /**
   * Validador de política de contraseña
   * Requiere: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
   */
  passwordPolicyValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null;
      }

      const hasMinLength = value.length >= 8;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      const passwordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

      return !passwordValid
        ? {
            passwordPolicy: {
              hasMinLength,
              hasUpperCase,
              hasLowerCase,
              hasNumber,
              hasSpecialChar
            }
          }
        : null;
    };
  }

  /**
   * Validador para verificar que las contraseñas coincidan
   */
  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const newPassword = control.get('newPassword')?.value;
      const confirmPassword = control.get('confirmPassword')?.value;

      if (!newPassword || !confirmPassword) {
        return null;
      }

      return newPassword === confirmPassword ? null : { passwordMismatch: true };
    };
  }

  async guardarPerfil() {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Revisa los campos obligatorios antes de guardar.',
        life: 3000
      });
      return;
    }

    if (!this.currentEnterprise?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa no disponible',
        detail: 'No hay una empresa cargada para actualizar.',
        life: 3000
      });
      return;
    }

    const datos = this.perfilForm.value as Partial<CreateEnterpriseDto>;

    this.enterpriseService
      .updateEnterprise(this.currentEnterprise.id, datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (enterprise) => {
          this.currentEnterprise = enterprise;
          this.messageService.add({
            severity: 'success',
            summary: 'Perfil actualizado',
            detail: 'Los datos de la empresa se han actualizado correctamente',
            life: 3000
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al actualizar',
            detail: 'No se pudo actualizar el perfil de la empresa. Inténtalo de nuevo.',
            life: 5000
          });
        }
      });
  }

  cambiarPassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor, completa todos los campos correctamente',
        life: 3000
      });
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;

    // Llamar al servicio de autenticación para cambiar la contraseña
    this.authService
      .changePassword(currentPassword, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Contraseña actualizada',
            detail: 'Tu contraseña se ha cambiado correctamente',
            life: 3000
          });
          // Resetear el formulario después de actualizar
          this.passwordForm.reset();
        },
        error: (error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al cambiar contraseña',
            detail: this.getErrorMessage(
              error,
              'No se pudo actualizar la contraseña. Verifica los datos e inténtalo de nuevo.'
            ),
            life: 5000
          });
        }
      });
  }

  async cargarPerfil() {
    const user = this.authService.currentUser;
    if (!user) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sesión no disponible',
        detail: 'No hay un usuario autenticado.',
        life: 3000
      });
      return;
    }

    // Obtener la empresa del usuario autenticado
    // Asumiendo que el usuario tiene una empresa asociada
    // Puedes obtener el ID de la empresa del perfil del usuario o de otro lugar
    this.enterpriseService
      .listEnterprises()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (enterprises) => {
          if (enterprises.length > 0) {
            // Tomar la primera empresa (o implementar lógica para seleccionar la correcta)
            this.currentEnterprise = enterprises[0];

            // Cargar los datos en el formulario
            this.perfilForm.patchValue({
              type: this.currentEnterprise.type,
              name: this.currentEnterprise.name,
              cifNif: this.currentEnterprise.cifNif,
              email: this.currentEnterprise.email,
              country: this.currentEnterprise.country,
              city: this.currentEnterprise.city,
              address: this.currentEnterprise.address,
              postalCode: this.currentEnterprise.postalCode,
              firstPhonePrefix: this.currentEnterprise.firstPhonePrefix,
              firstPhoneNumber: this.currentEnterprise.firstPhoneNumber,
              secondPhonePrefix: this.currentEnterprise.secondPhonePrefix || '',
              secondPhoneNumber: this.currentEnterprise.secondPhoneNumber || '',
              iban: this.currentEnterprise.iban || ''
            });
          } else {
            this.currentEnterprise = undefined;
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al cargar',
            detail: 'No se pudo cargar el perfil de la empresa.',
            life: 5000
          });
        }
      });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const responseError = (error as { error?: { message?: unknown } }).error;
      if (typeof responseError?.message === 'string') {
        return responseError.message;
      }
    }

    return fallback;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
