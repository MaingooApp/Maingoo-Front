import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConvertNumbers } from '../../../core/helpers/numbers';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { Invoice, InvoiceService } from '../../../core/services/invoice.service';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-invoice-detail',
    imports: [CommonModule, RouterModule, ButtonModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, DialogModule],
    templateUrl: './invoice-detail.component.html'
})
export class InvoiceDetailComponent implements OnInit {
    factura: Invoice | null = null;
    ConvertNumbers = ConvertNumbers;
    mostrarImagen = false;
    pdfUrlSanitizado: SafeResourceUrl | null = null;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private sanitizer: DomSanitizer,
        private invoiceService: InvoiceService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        const facturaId = this.route.snapshot.paramMap.get('id');

        if (!facturaId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se proporcionó un ID de factura válido.'
            });
            this.router.navigate(['/facturas']);
            return;
        }

        this.cargarFactura(facturaId);
    }

    cargarFactura(id: string) {
        this.loading = true;
        this.invoiceService.getInvoiceById(id).subscribe({
            next: (factura: Invoice) => {
                this.factura = factura;

                // Si hay imagen y es PDF, preparar la URL sanitizada
                if (factura.imageUrl && factura.imageUrl.includes('.pdf')) {
                    this.pdfUrlSanitizado = this.sanitizer.bypassSecurityTrustResourceUrl(factura.imageUrl);
                } else if (factura.imageUrl) {
                    // Para imágenes normales, también sanitizar si es necesario
                    this.pdfUrlSanitizado = this.sanitizer.bypassSecurityTrustResourceUrl(factura.imageUrl);
                }

                this.loading = false;
            },
            error: (error: any) => {
                console.error('Error cargando la factura:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la factura. Por favor, intenta nuevamente.'
                });
                this.loading = false;
                this.router.navigate(['/facturas']);
            }
        });
    }

    volver() {
        this.router.navigate(['/facturas']);
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }
}
