import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConvertNumbers } from '../../../shared/helpers/numbers';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { Invoice, InvoiceService } from '../../../core/services/invoice.service';
import { ToastService } from '../../../shared/services/toast.service';

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
    downloadingDocument = false;

    // Clave para el almacenamiento de caché
    private readonly CACHE_KEY_PREFIX = 'invoice_document_cache_';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private sanitizer: DomSanitizer,
        private invoiceService: InvoiceService,
        private toastService: ToastService
    ) {}

    ngOnInit() {
        const facturaId = this.route.snapshot.paramMap.get('id');

        if (!facturaId) {
            this.toastService.error('Error', 'No se proporcionó un ID de factura válido.');
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
                this.toastService.error('Error', 'No se pudo cargar la factura. Por favor, intenta nuevamente.');
                this.loading = false;
                this.router.navigate(['/facturas']);
            }
        });
    }

    volver() {
        this.router.navigate(['/facturas']);
    }

    descargarDocumentoOriginal() {
        if (!this.factura?.id) {
            this.toastService.error('Error', 'No se puede descargar el documento.');
            return;
        }

        // Verificar si tenemos una URL en caché válida
        const cachedData = this.getCachedDocumentUrl(this.factura.id);
        if (cachedData) {
            this.downloadFile(cachedData.url, this.factura.blobName || 'factura.pdf');
            return;
        }

        // Si no hay caché o expiró, obtener nueva URL
        this.downloadingDocument = true;
        this.invoiceService.getDocumentUrl(this.factura.id, 24).subscribe({
            next: (response) => {
                // Guardar en caché la URL con su fecha de expiración
                this.setCachedDocumentUrl(this.factura!.id, response.url, response.expiresIn);

                // Descargar el archivo
                this.downloadFile(response.url, response.blobName);

                this.toastService.success('Éxito', 'Documento descargado correctamente.');
                this.downloadingDocument = false;
            },
            error: (error: any) => {
                console.error('Error descargando documento:', error);
                this.toastService.error('Error', 'No se pudo descargar el documento. Por favor, intenta nuevamente.');
                this.downloadingDocument = false;
            }
        });
    }

    /**
     * Obtiene la URL del documento desde sessionStorage si aún es válida
     */
    private getCachedDocumentUrl(invoiceId: string): { url: string } | null {
        try {
            const cacheKey = this.CACHE_KEY_PREFIX + invoiceId;
            const cachedData = sessionStorage.getItem(cacheKey);

            if (!cachedData) {
                return null;
            }

            const parsed = JSON.parse(cachedData);
            const expiresAt = new Date(parsed.expiresAt);
            const now = new Date();

            // Verificar si la URL aún no ha expirado (con un margen de 5 minutos)
            const expiresWithMargin = new Date(expiresAt.getTime() - 5 * 60 * 1000);

            if (now < expiresWithMargin) {
                return { url: parsed.url };
            }

            // Si expiró, eliminar del storage
            sessionStorage.removeItem(cacheKey);
            return null;
        } catch (error) {
            console.error('Error al leer caché de documento:', error);
            return null;
        }
    }

    /**
     * Guarda la URL del documento en sessionStorage
     */
    private setCachedDocumentUrl(invoiceId: string, url: string, expiresInHours: number) {
        try {
            const cacheKey = this.CACHE_KEY_PREFIX + invoiceId;
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + expiresInHours);

            const cacheData = {
                url,
                expiresAt: expiresAt.toISOString()
            };

            sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error al guardar caché de documento:', error);
        }
    }

    /**
     * Descarga un archivo usando la URL proporcionada
     */
    private downloadFile(url: string, filename: string) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }
}
