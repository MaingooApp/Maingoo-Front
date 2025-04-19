import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import html2pdf from 'html2pdf.js';
// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { FluidModule } from 'primeng/fluid';
import { NegocioService } from '../../core/services/negocio.service';
import { AuthService } from '../../core/services/auth-service.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-my-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, InputTextModule, InputMaskModule, ButtonModule, CardModule, FluidModule],
    templateUrl: './my-profile.component.html',
    styleUrl: './my-profile.component.scss'
})
export class MyProfileComponent {
    @ViewChild('htmlFrame', { static: false }) htmlFrame!: ElementRef;
    perfilForm!: FormGroup;
    cargando = false;

    constructor(
        private fb: FormBuilder,
        private negocioService: NegocioService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.perfilForm = this.fb.group({
            nombre: ['', Validators.required],
            nif: [''],
            direccion: [''],
            telefono: [''],
            telefono2: [''],
            email: ['', [Validators.required, Validators.email]],
            iban: [''],
            contactos: this.fb.array([]) // << contactos dinámicos
        });
        this.cargarPerfil();
    }

    async guardarPerfil() {
        if (this.perfilForm.invalid) {
            this.perfilForm.markAllAsTouched(); // Marca todos los campos para mostrar errores
            return;
        }

        const user = this.authService.currentUser;
        if (!user) {
            console.error('No hay usuario autenticado.');
            return;
        }

        try {
            const negocioId = await this.authService.getNegocioId(user.uid);
            if (!negocioId) {
                console.error('No se pudo obtener el ID del negocio.');
                return;
            }

            const datos = this.perfilForm.value;

            await this.negocioService.guardarPerfilNegocio(negocioId, datos);

            console.log('Perfil guardado correctamente ✅');
            // Aquí puedes lanzar un toast de éxito o redirigir si quieres
        } catch (error) {
            console.error('❌ Error al guardar el perfil del negocio:', error);
            // También puedes mostrar un toast de error aquí
        }
    }

    get contactos(): FormArray {
        return this.perfilForm.get('contactos') as FormArray;
    }

    agregarContacto() {
        const contacto = this.fb.group({
            nombre: [''],
            telefono: [''],
            cargo: ['']
        });
        this.contactos.push(contacto);
    }

    eliminarContacto(index: number) {
        this.contactos.removeAt(index);
    }

    async cargarPerfil() {
        const user = this.authService.currentUser;
        if (!user) {
            console.error('No hay usuario autenticado.');
            return;
        }

        try {
            const negocioId = await this.authService.getNegocioId(user.uid);
            if (!negocioId) {
                console.error('No se pudo obtener el ID del negocio.');
                return;
            }

            const datos = await this.negocioService.getPerfilNegocio(negocioId);
            if (!datos) {
                console.log('No hay datos de perfil aún.');
                return;
            }

            // Asegúrate de que los contactos sean un array válido
            if (Array.isArray(datos.contactos)) {
                this.contactos.clear(); // limpia el FormArray

                for (const contacto of datos.contactos) {
                    this.contactos.push(
                        this.fb.group({
                            nombre: [contacto.nombre || ''],
                            telefono: [contacto.telefono || ''],
                            cargo: [contacto.cargo || '']
                        })
                    );
                }
            }

            // Aplica el resto del perfil
            this.perfilForm.patchValue({
                nombre: datos.nombre || '',
                nif: datos.nif || '',
                direccion: datos.direccion || '',
                telefono: datos.telefono || '',
                telefono2: datos.telefono2 || '',
                email: datos.email || '',
                iban: datos.iban || ''
            });

            console.log('Perfil cargado correctamente ✅');
        } catch (error) {
            console.error('❌ Error al cargar el perfil del negocio:', error);
        }
    }

    async descargarPerfilComoPDF() {
        const user = await firstValueFrom(this.authService.authState$);
        if (!user) return;

        const negocioId = await this.authService.getNegocioId(user.uid);
        if (!negocioId) {
            console.error('No se pudo obtener el ID del negocio.');
            return;
        }
        const datos = await this.negocioService.getPerfilNegocio(negocioId);
        const response = await this.negocioService.descargarHtmlEmpresa(datos);

        const iframeDoc = this.htmlFrame.nativeElement.contentDocument || this.htmlFrame.nativeElement.contentWindow?.document;
        if (!iframeDoc) return;

        iframeDoc.open();
        iframeDoc.write(response);
        iframeDoc.close();

        html2pdf().from(iframeDoc.body).set({
            margin: 10,
            filename: 'perfil_empresa.pdf',
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
    }
}
