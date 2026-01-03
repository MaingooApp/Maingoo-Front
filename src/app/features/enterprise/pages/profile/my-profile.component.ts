import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
import { Enterprise, EnterpriseService } from '../../services/enterprise.service';
import { AuthService } from '../../../auth/services/auth-service.service';

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
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.scss'
})
export class MyProfileComponent {
  perfilForm!: FormGroup;
  passwordForm!: FormGroup;
  currentEnterprise?: Enterprise;

  constructor(
    private fb: FormBuilder,
    private enterpriseService: EnterpriseService,
    private authService: AuthService,
    private messageService: MessageService
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
      console.error('Formulario inválido');
      return;
    }

    if (!this.currentEnterprise?.id) {
      console.error('No hay empresa cargada para actualizar');
      return;
    }

    const datos = this.perfilForm.value;

    this.enterpriseService.updateEnterprise(this.currentEnterprise.id, datos).subscribe({
      next: (enterprise) => {
        this.currentEnterprise = enterprise;
        this.messageService.add({
          severity: 'success',
          summary: 'Perfil actualizado',
          detail: 'Los datos de la empresa se han actualizado correctamente',
          life: 3000
        });
      },
      error: (error) => {
        console.error('❌ Error al actualizar el perfil de la empresa:', error);
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
    this.authService.changePassword(currentPassword, newPassword).subscribe({
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
      error: (error: any) => {
        console.error('❌ Error al cambiar la contraseña:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al cambiar contraseña',
          detail:
            error?.error?.message || 'No se pudo actualizar la contraseña. Verifica los datos e inténtalo de nuevo.',
          life: 5000
        });
      }
    });
  }

  async cargarPerfil() {
    const user = this.authService.currentUser;
    if (!user) {
      console.error('No hay usuario autenticado.');
      return;
    }

    // Obtener la empresa del usuario autenticado
    // Asumiendo que el usuario tiene una empresa asociada
    // Puedes obtener el ID de la empresa del perfil del usuario o de otro lugar
    this.enterpriseService.listEnterprises().subscribe({
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

          console.log('✅ Perfil de empresa cargado correctamente');
        } else {
          console.log('No hay empresas registradas para este usuario.');
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar el perfil de la empresa:', error);
      }
    });
  }
}
