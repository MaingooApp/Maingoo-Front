// invoice-summary.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ConvertNumbers } from '../../../core/helpers/numbers';
import { InvoiceFromBackend } from '../../../core/interfaces/Invoice.interfaces';
import { InvoiceService } from '../../../core/services/invoice-service.service';
import { TablaDinamicaComponent } from '../../../shared/components/tabla-dinamica/tabla-dinamica.component';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-invoice-summary',
    templateUrl: './invoice-summary.component.html',
    imports: [CommonModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TablaDinamicaComponent, DialogModule, FormsModule]
})
export class InvoiceSummaryComponent implements OnInit {
    @ViewChild(TablaDinamicaComponent) tablaRef!: TablaDinamicaComponent;
    facturas: InvoiceFromBackend[] = [];
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

    constructor(
        private invoiceService: InvoiceService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.invoiceService.getFacturas().subscribe({
            next: (data) => {
                this.facturas = data;
                console.log('Facturas cargadas:', this.facturas);

                this.loading = false;
            },
            error: (err) => {
                console.error('Error cargando facturas', err);
                this.loading = false;
            }
        });
    }

    verDetalle(factura: InvoiceFromBackend) {
        this.router.navigate(['/facturas/detalle', factura.id]);
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }

    confirmarEliminacion(factura: InvoiceFromBackend) {
        this.confirmationService.confirm({
            message: `¿Seguro que deseas eliminar la factura <b>${factura.invoiceNumber || 'sin número'}</b>?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            accept: () => {
                this.eliminarFactura(factura);
                this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'La factura ha sido eliminada.' });
            }
        });
    }

    eliminarFactura(factura: InvoiceFromBackend) {
        if (!factura.id) {
            console.warn('No se puede eliminar una factura sin ID.');
            return;
        }

        this.invoiceService.eliminarFactura(factura.id).subscribe({
            next: () => {
                this.facturas = this.facturas.filter((f) => f.id !== factura.id);
            },
            error: (error) => {
                console.error('Error eliminando la factura:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo eliminar la factura.'
                });
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
            this.messageService.add({
                severity: 'warn',
                summary: 'No hay facturas seleccionadas',
                detail: 'Debe haber almenos 1 factura.'
            });
            return;
        }

        this.mostrarModalExportar = true;
    }

    descargarZip() {
        this.mostrarInputCorreo = false;
        this.exportando = true;
        const facturasFiltradas = this.tablaRef.getFiltrados();

        this.invoiceService.descargarZipFacturas(facturasFiltradas).subscribe({
            next: (blob) => {
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
            error: (err) => {
                console.error('Error al generar el ZIP', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error al descargar',
                    detail: 'No se pudo generar el archivo ZIP. Intenta nuevamente.'
                });
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
            this.messageService.add({
                severity: 'warn',
                summary: 'Correo requerido',
                detail: 'Debes ingresar un correo de destino.'
            });
            this.exportando = false;
            return;
        }

        this.invoiceService.enviarFacturasPorCorreo(facturas, this.correoDestino).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Correo enviado',
                    detail: 'Las facturas se han enviado correctamente.'
                });

                this.mostrarModalExportar = false;
                this.mostrarInputCorreo = false;
                this.correoDestino = '';
            },
            error: (err) => {
                console.error('❌ Error al enviar correo:', err);

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error al enviar',
                    detail: 'No se pudo enviar el correo. Intenta nuevamente.'
                });
            },
            complete: () => {
                this.exportando = false;
            }
        });
    }
}
