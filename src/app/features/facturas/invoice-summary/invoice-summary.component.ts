// invoice-summary.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ConvertNumbers } from '../../../shared/helpers/numbers';
import { Invoice, InvoiceService } from '../../../core/services/invoice.service';
import { TablaDinamicaComponent } from '../../../shared/components/tabla-dinamica/tabla-dinamica.component';
import { DialogModule } from 'primeng/dialog';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { FileUploadModule } from 'primeng/fileupload';
import { AnalysisDocument, DocumentAnalysisService } from '../../../core/services/document-analysis.service';
import { interval, Subscription, switchMap, takeWhile } from 'rxjs';
import { CreateSupplierDto, SupplierService } from '../../../core/services/supplier.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
    selector: 'app-invoice-summary',
    templateUrl: './invoice-summary.component.html',
    imports: [CommonModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TablaDinamicaComponent, DialogModule, FormsModule, FileUploadModule]
})
export class InvoiceSummaryComponent implements OnInit {
    @ViewChild(TablaDinamicaComponent) tablaRef!: TablaDinamicaComponent;
    facturas: Invoice[] = [];
    loading = true;
    ConvertNumbers = ConvertNumbers;
    columnas = [
        { field: 'invoiceNumber', header: 'Número', type: 'text', filter: true },
        { field: 'supplier.name', header: 'Proveedor', type: 'text', filter: true },
        { field: 'date', header: 'Fecha emisión', type: 'date', filter: true },
        { field: 'amount', header: 'Total con IVA', type: 'numeric', filter: true }
    ] as const;

    acciones = [
        { icon: 'pi pi-eye', action: 'editar', tooltip: 'Ver detalle', color: 'success' },
        { icon: 'pi pi-trash', action: 'eliminar', tooltip: 'Eliminar', color: 'danger' }
    ] as const;

    mostrarModalExportar = false;
    mostrarInputCorreo = false;
    correoDestino = '';
    exportando = false;
    currentDocument: AnalysisDocument | null = null;
    currentInvoice: Invoice | null = null;
    msg: string = '';
    cargando = false;

    proveedorForm!: FormGroup;
    mostrarModalProveedor = false;
    display: boolean = false;

    private pollingSubscription?: Subscription;

    constructor(
        private invoiceService: InvoiceService,
        private confirmDialog: ConfirmDialogService,
        private toastService: ToastService,
        private router: Router,
        private documentAnalysisService: DocumentAnalysisService,
        private supplierService: SupplierService,
        private fb: FormBuilder
    ) {}

    onUpload(event: any) {
        const files = event.files as File[];
        if (!files || files.length === 0) {
            this.toastService.warn('Sin archivo', 'Por favor selecciona un archivo para subir');
            return;
        }

        const file = files[0];

        // Validar el archivo
        console.log('Archivo seleccionado:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });

        // Verificar si es un formato de imagen o PDF válido
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
        const fileType = file.type.toLowerCase();

        if (!fileType || (!validTypes.includes(fileType) && !file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif|pdf)$/))) {
            this.toastService.warn('Formato inválido', 'Por favor selecciona una imagen (JPG, PNG, WEBP, HEIC) o un PDF');
            return;
        }

        // Verificar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.toastService.warn('Archivo muy grande', 'El archivo no puede superar los 10MB');
            return;
        }

        this.uploadInvoice(file);
    }

    private uploadInvoice(file: File) {
        if (this.cargando) return;

        this.cargando = true;
        this.msg = 'Subiendo documento para análisis con IA...';
        this.currentDocument = null;
        this.currentInvoice = null;

        this.documentAnalysisService.submitInvoiceForAnalysis(file, 'Factura subida desde el frontend').subscribe({
            next: (response) => {
                this.toastService.success('Documento subido', 'El documento está siendo analizado por IA...', 3000);
                this.startPollingDocumentStatus(response.documentId);
            },
            error: (error) => {
                console.error('Error al subir documento:', error);
                console.error('Error completo:', JSON.stringify(error, null, 2));
                console.error('Error status:', error?.status);
                console.error('Error message:', error?.message);
                console.error('Error error:', error?.error);

                this.cargando = false;
                this.msg = '';

                let errorDetail = 'No se pudo subir el archivo. ';

                if (error?.status === 0) {
                    errorDetail += 'No hay conexión con el servidor. Verifica tu conexión a internet.';
                } else if (error?.error?.message) {
                    errorDetail += error.error.message;
                } else if (error?.message) {
                    errorDetail += error.message;
                } else {
                    errorDetail += 'Error desconocido. Por favor intenta nuevamente.';
                }

                this.toastService.error('Error al subir', errorDetail, 5000);
            }
        });
    }

    private startPollingDocumentStatus(documentId: string) {
        this.msg = 'Analizando documento con IA...';

        this.pollingSubscription = interval(3000)
            .pipe(
                switchMap(() => this.documentAnalysisService.getDocumentById(documentId)),
                takeWhile((doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING', true)
            )
            .subscribe({
                next: (document) => {
                    this.currentDocument = document;

                    if (document.status === 'PROCESSING') {
                        this.msg = 'IA procesando el documento...';
                    } else if (document.status === 'DONE') {
                        this.onAnalysisComplete(document);
                    } else if (document.status === 'FAILED') {
                        this.onAnalysisFailed(document);
                    }
                },
                error: (error) => {
                    console.error('Error al verificar estado:', error);
                    this.cargando = false;
                    this.msg = '';
                    this.toastService.error('Error', 'No se pudo verificar el estado del análisis', 5000);
                }
            });
    }

    private onAnalysisComplete(document: AnalysisDocument) {
        this.cargando = false;
        this.msg = 'Análisis completado exitosamente!';

        this.toastService.success('Análisis completado', 'La factura ha sido procesada y creada automáticamente', 5000);

        if (document.invoiceId) {
            this.loadInvoice(document.invoiceId);
        } else {
            console.warn('El documento no tiene invoiceId asociado');
        }

        if (document.extraction?.supplierCifNif) {
            this.checkIfSupplierExists(document.extraction);
        }
    }

    private onAnalysisFailed(document: AnalysisDocument) {
        this.cargando = false;
        this.msg = '';

        this.toastService.error('Análisis fallido', 'No se pudo analizar el documento. Por favor verifica que sea una imagen clara de una factura.', 5000);
    }

    private loadInvoice(invoiceId: string) {
        this.invoiceService.getInvoiceById(invoiceId).subscribe({
            next: (invoice) => {
                console.log(invoice);

                this.currentInvoice = invoice;
                console.log('Factura cargada:', invoice);
            },
            error: (error) => {
                console.error('Error al cargar factura:', error);
                this.toastService.warn('Advertencia', 'La factura se creó pero no se pudo cargar sus detalles', 5000);
            }
        });
    }

    private checkIfSupplierExists(extraction: any) {
        const supplierName = extraction.supplierName || '';
        const supplierTaxId = extraction.supplierCifNif || '';

        if (!supplierTaxId) return;

        this.confirmAgregarProveedor(supplierName, supplierTaxId);
    }

    private confirmAgregarProveedor(supplierName: string, supplierTaxId: string) {
        this.confirmDialog.confirm({
            header: 'Registrar proveedor',
            icon: 'pi pi-question-circle',
            message: `¿Deseas registrar al proveedor "${supplierName}" en el sistema?`,
            acceptLabel: 'Sí, registrar',
            rejectLabel: 'No',
            onAccept: () => {
                this.proveedorForm = this.fb.group({
                    name: [supplierName || '', Validators.required],
                    taxId: [supplierTaxId || '', Validators.required],
                    email: ['', [Validators.email]],
                    phone: [''],
                    address: ['']
                });

                this.mostrarModalProveedor = true;
            }
        });
    }

    guardarProveedor() {
        if (this.proveedorForm.invalid) {
            this.toastService.warn('Formulario inválido', 'Por favor completa todos los campos requeridos');
            return;
        }

        const supplierData: CreateSupplierDto = this.proveedorForm.value;

        this.supplierService.createSupplier(supplierData).subscribe({
            next: (supplier) => {
                this.toastService.success('Proveedor guardado', `${supplier.name} ha sido registrado exitosamente`);
                this.mostrarModalProveedor = false;
            },
            error: (error) => {
                console.error('Error al guardar proveedor:', error);
                this.toastService.error('Error', 'No se pudo guardar el proveedor. Intenta nuevamente.');
            }
        });
    }

    ngOnDestroy() {
        if (this.pollingSubscription) {
            this.pollingSubscription.unsubscribe();
        }
    }

    formatAmount(amount: number): string {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }
    ngOnInit(): void {
        this.invoiceService.getInvoices().subscribe({
            next: (data: Invoice[]) => {
                this.facturas = data;
                console.log('Facturas cargadas:', this.facturas);

                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error cargando facturas', err);
                this.loading = false;
            }
        });
    }

    verDetalle(factura: Invoice) {
        this.router.navigate(['/facturas/detalle', factura.id]);
    }

    confirmarEliminacion(factura: Invoice) {
        this.confirmDialog.confirmDeletion(`¿Seguro que deseas eliminar la factura <b>${factura.invoiceNumber || 'sin número'}</b>?`, {
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            onAccept: () => {
                this.eliminarFactura(factura);
                this.toastService.success('Eliminado', 'La factura ha sido eliminada.');
            }
        });
    }

    eliminarFactura(factura: Invoice) {
        if (!factura.id) {
            console.warn('No se puede eliminar una factura sin ID.');
            return;
        }

        this.invoiceService.deleteInvoice(factura.id).subscribe({
            next: () => {
                this.facturas = this.facturas.filter((f) => f.id !== factura.id);
            },
            error: (error: any) => {
                console.error('Error eliminando la factura:', error);
                this.toastService.error('Error', 'No se pudo eliminar la factura.');
            }
        });
    }

    handleAccion(event: { action: string; row: any }) {
        if (event.action === 'editar') {
            this.verDetalle(event.row);
        } else if (event.action === 'eliminar') {
            this.confirmarEliminacion(event.row);
        }
    }

    exportarFacturas() {
        const facturasFiltradas = this.tablaRef.getFiltrados();
        if (!facturasFiltradas || facturasFiltradas.length === 0) {
            this.toastService.warn('No hay facturas seleccionadas', 'Debe haber almenos 1 factura.');
            return;
        }

        this.mostrarModalExportar = true;
    }

    descargarZip() {
        this.mostrarInputCorreo = false;
        this.exportando = true;
        const facturasFiltradas = this.tablaRef.getFiltrados();

        this.invoiceService.descargarZipFacturas(facturasFiltradas).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'facturas.zip';
                a.click();
                window.URL.revokeObjectURL(url);
                this.mostrarModalExportar = false;
                this.mostrarInputCorreo = false;
                this.correoDestino = '';
            },
            error: (err: any) => {
                console.error('Error al generar el ZIP', err);
                this.toastService.error('Error al descargar', 'No se pudo generar el archivo ZIP. Intenta nuevamente.');
            },
            complete: () => {
                this.exportando = false;
            }
        });
    }

    enviarPorCorreo() {
        this.exportando = true;
        const facturas = this.tablaRef.getFiltrados();

        if (!this.correoDestino) {
            this.toastService.warn('Correo requerido', 'Debes ingresar un correo de destino.');
            this.exportando = false;
            return;
        }

        this.invoiceService.enviarFacturasPorCorreo(facturas, this.correoDestino).subscribe({
            next: () => {
                this.toastService.success('Correo enviado', 'Las facturas se han enviado correctamente.');

                this.mostrarModalExportar = false;
                this.mostrarInputCorreo = false;
                this.correoDestino = '';
            },
            error: (err: any) => {
                console.error('❌ Error al enviar correo:', err);

                this.toastService.error('Error al enviar', 'No se pudo enviar el correo. Intenta nuevamente.');
            },
            complete: () => {
                this.exportando = false;
            }
        });
    }
}
