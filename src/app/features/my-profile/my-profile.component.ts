import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { FluidModule } from 'primeng/fluid';
import { EnterpriseService, Enterprise, EnterpriseType } from '../../core/services/enterprise.service';
import { AuthService } from '../auth/services/auth-service.service';

@Component({
    selector: 'app-my-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, InputTextModule, InputMaskModule, ButtonModule, CardModule, FluidModule],
    templateUrl: './my-profile.component.html',
    styleUrl: './my-profile.component.scss'
})
export class MyProfileComponent {
    perfilForm!: FormGroup;
    currentEnterprise?: Enterprise;

    constructor(
        private fb: FormBuilder,
        private enterpriseService: EnterpriseService,
        private authService: AuthService
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
        this.cargarPerfil();
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
                console.log('✅ Perfil de empresa actualizado correctamente');
                // Aquí puedes lanzar un toast de éxito
            },
            error: (error) => {
                console.error('❌ Error al actualizar el perfil de la empresa:', error);
                // También puedes mostrar un toast de error aquí
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
