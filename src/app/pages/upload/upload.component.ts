import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { FluidModule } from 'primeng/fluid';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import { Invoice } from '../../core/interfaces/Invoice.interfaces';
import { InvoiceService } from '../../core/services/invoice-service.service';
import { OpenaiService } from '../../core/services/openai.service';
import { SupplierService } from '../../core/services/supplier.service';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../core/services/auth-service.service';

@Component({
  selector: 'app-upload',
  imports: [FluidModule,
    ButtonModule,
    FileUploadModule,
    FormsModule,
    CommonModule,
    MessagesModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DialogModule,
    ReactiveFormsModule
  ],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss',
})
export class UploadComponent {

  constructor(private messageService: MessageService,
    private openaiService: OpenaiService,
    private invoiceService: InvoiceService,
    private supplierService: SupplierService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private auth: AuthService,
  ) { }
  resultado: Invoice | null = null;
  msg: string = '';
  cargando = false;
  proveedorForm!: FormGroup;
  mostrarModalProveedor = false;

  onUpload(event: any) {
    const files = event.files as File[];
    if (!files || files.length === 0) return;

    const file = files[0]; // Tomamos solo el primero por ahora
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const mimeType = file.type;
      this.enviarAOpenAI(base64, mimeType);
    };

    reader.readAsDataURL(file);
  }

  enviarAOpenAI(base64: string, mimeType: string) {
    if (this.cargando) return;
    this.cargando = true;
    this.msg = 'Analizando imagen...';

    this.openaiService.analizarImagen(base64, mimeType).subscribe({
      next: async (res: any) => {
        this.cargando = false;
        console.log(res);

        const texto = res.choices[0].message.content;
        const inicio = texto.indexOf('{');
        const fin = texto.lastIndexOf('}');

        if (inicio !== -1 && fin !== -1) {
          const soloJSON = texto.substring(inicio, fin + 1);
          try {
            this.resultado = JSON.parse(soloJSON);
            if (this.resultado) {
              this.resultado.imagen = base64;
              this.resultado.mimeType = mimeType;
            }
            await this.invoiceService.saveInvoice(this.resultado)
            if (this.resultado) {
              const proveedorExiste = await this.supplierService.checkProveedorPorNif(this.resultado.proveedor.nif);
              if (!proveedorExiste) {
                this.confirmAgregarProveedor();
              }
            }
          } catch (e) {
            this.resultado = null;
            this.messageService.add({
              severity: 'error',
              summary: 'Error al procesar factura',
              detail: 'No se pudo interpretar la información del documento. Intente nuevamente.',
              life: 5000
            });
            console.error('Error al parsear JSON:', e);
          }
        } else {
          this.resultado = null;
          console.error('No se encontró JSON');
        }

      },
      error: (err) => {
        this.cargando = false;
        this.msg = 'Error al procesar la imagen.';
        console.error(err);
      }
    });
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  convertToDecimal(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const sanitized = value.replace(',', '.');
      const parsed = parseFloat(sanitized);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  confirmAgregarProveedor() {
    this.confirmationService.confirm({
      header: 'Proveedor no encontrado',
      icon: 'pi pi-exclamation-triangle',
      message: 'El proveedor no está registrado. ¿Deseas agregarlo ahora?',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.proveedorForm = this.fb.group({
          nombre: [this.resultado?.proveedor?.nombre || '', Validators.required],
          nif: [this.resultado?.proveedor?.nif || '', Validators.required],
          direccion: [this.resultado?.proveedor?.direccion || ''],
          telefono: [this.resultado?.proveedor?.telefono || ''],
          email: [this.resultado?.proveedor?.email || '', [Validators.email]]
        });
  
        this.mostrarModalProveedor = true;
      }
    });
  }
  
  async guardarProveedor() {
    const user = await this.auth.currentUser;
    if (!user || this.proveedorForm.invalid) return;
  
    try {
      const proveedor = this.proveedorForm.value;
      await this.supplierService.agregarProveedor(proveedor, user.uid);
      this.messageService.add({ severity: 'success', summary: 'Proveedor guardado' });
      this.mostrarModalProveedor = false;
    } catch (err) {
      console.error(err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el proveedor' });
    }
  }
  
}
