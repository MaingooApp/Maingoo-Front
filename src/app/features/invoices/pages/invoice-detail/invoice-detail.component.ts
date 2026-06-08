import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { DocumentTypePipe } from '@app/core/pipes/document-type.pipe';
import { ConvertNumbers } from '@shared/helpers/numbers';
import { ToastService } from '@shared/services/toast.service';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { InvoiceService } from '../../services/invoice.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-invoice-detail',
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DocumentTypePipe,
    IconComponent
  ],
  templateUrl: './invoice-detail.component.html'
})
export class InvoiceDetailComponent implements OnInit {
  factura: Invoice | null = null;
  ConvertNumbers = ConvertNumbers;
  loading = true;
  downloadingDocument = false;

  private readonly CACHE_KEY_PREFIX = 'invoice_document_cache_';
  private destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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
    this.invoiceService
      .getInvoiceById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (factura: Invoice) => {
          this.factura = factura;

          this.loading = false;
        },
        error: () => {
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
    this.invoiceService
      .getDocumentUrl(this.factura.id, 24)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // Guardar en caché la URL con su fecha de expiración
          this.setCachedDocumentUrl(this.factura!.id, response.url, response.expiresIn);

          // Descargar el archivo
          this.downloadFile(response.url, response.blobName);

          this.toastService.success('Éxito', 'Documento descargado correctamente.');
          this.downloadingDocument = false;
        },
        error: () => {
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

      const parsed = JSON.parse(cachedData) as { url?: string; expiresAt?: string };
      if (!parsed.url || !parsed.expiresAt) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }

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
    } catch {
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
    } catch {
      // Session storage may be unavailable; failing to cache must not block the download.
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
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    return input?.value ?? '';
  }
}
