import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { FluidModule } from 'primeng/fluid';

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
    FluidModule
  ],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.scss'
})
export class MyProfileComponent {
  perfilForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.perfilForm = this.fb.group({
      nombre: ['', Validators.required],
      nif: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', Validators.required],
      telefono2: [''],
      email: ['', [Validators.email]],
      iban: [null]
    });

    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    const data = {
      nombre: 'Mi Negocio SL',
      nif: 'B12345678',
      direccion: 'Calle Falsa 123',
      telefono: '600 123 456',
      email: 'contacto@minegocio.com',
    };

    this.perfilForm.patchValue(data);
  }

  guardarPerfil() {
    if (this.perfilForm.valid) {
      const datos = this.perfilForm.value;
      console.log('Guardando perfil:', datos);
      // lógica de guardado (Firebase, etc.)
    }
  }

}
