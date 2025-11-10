import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
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
import { DialogModule } from 'primeng/dialog';
import { DocumentAnalysisService, AnalysisDocument } from '../../core/services/document-analysis.service';
import { InvoiceService, Invoice } from '../../core/services/invoice.service';
import { SupplierService, CreateSupplierDto } from '../../core/services/supplier.service';
import { interval, Subscription, switchMap, takeWhile } from 'rxjs';

@Component({
    selector: 'app-upload',
    standalone: true,
    imports: [FluidModule, ButtonModule, FileUploadModule, FormsModule, CommonModule, MessagesModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, DialogModule, ReactiveFormsModule],
    templateUrl: './upload.component.html',
    styleUrl: './upload.component.scss'
})
export class UploadComponent implements OnDestroy {
    currentDocument: AnalysisDocument | null = null;
    currentInvoice: Invoice | null = null;
    msg: string = '';
    cargando = false;

    proveedorForm!: FormGroup;
    mostrarModalProveedor = false;

    private pollingSubscription?: Subscription;

    constructor(
        private messageService: MessageService,
        private documentAnalysisService: DocumentAnalysisService,
        private invoiceService: InvoiceService,
        private supplierService: SupplierService,
        private confirmationService: ConfirmationService,
        private fb: FormBuilder
    ) {}

    onUpload(event: any) {
        const files = event.files as File[];
        if (!files || files.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sin archivo',
                detail: 'Por favor selecciona un archivo para subir'
            });
            return;
        }

        const file = files[0];
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
                this.messageService.add({
                    severity: 'success',
                    summary: 'Documento subido',
                    detail: 'El documento está siendo analizado por IA...',
                    life: 3000
                });
                this.startPollingDocumentStatus(response.documentId);
            },
            error: (error) => {
                console.error('Error al subir documento:', error);
                this.cargando = false;
                this.msg = error;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error al subir',
                    detail: error.message,
                    life: 5000
                });
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
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo verificar el estado del análisis',
                        life: 5000
                    });
                }
            });
    }

    private onAnalysisComplete(document: AnalysisDocument) {
        this.cargando = false;
        this.msg = 'Análisis completado exitosamente!';

        this.messageService.add({
            severity: 'success',
            summary: 'Análisis completado',
            detail: 'La factura ha sido procesada y creada automáticamente',
            life: 5000
        });

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

        this.messageService.add({
            severity: 'error',
            summary: 'Análisis fallido',
            detail: 'No se pudo analizar el documento. Por favor verifica que sea una imagen clara de una factura.',
            life: 5000
        });
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
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: 'La factura se creó pero no se pudo cargar sus detalles',
                    life: 5000
                });
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
        this.confirmationService.confirm({
            header: 'Registrar proveedor',
            icon: 'pi pi-question-circle',
            message: `¿Deseas registrar al proveedor "${supplierName}" en el sistema?`,
            acceptLabel: 'Sí, registrar',
            rejectLabel: 'No',
            accept: () => {
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
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario inválido',
                detail: 'Por favor completa todos los campos requeridos'
            });
            return;
        }

        const supplierData: CreateSupplierDto = this.proveedorForm.value;

        this.supplierService.createSupplier(supplierData).subscribe({
            next: (supplier) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Proveedor guardado',
                    detail: `${supplier.name} ha sido registrado exitosamente`
                });
                this.mostrarModalProveedor = false;
            },
            error: (error) => {
                console.error('Error al guardar proveedor:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo guardar el proveedor. Intenta nuevamente.'
                });
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
}
