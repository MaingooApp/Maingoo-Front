// invoice.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../../../core/services/base-http.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CreateInvoiceDto, DocumentUrlResponse, Invoice, Product } from '@app/core/interfaces/Invoice.interfaces';

/**
 * Servicio para gestionar facturas
 * Endpoints: /api/suppliers/invoices/*
 */
@Injectable({ providedIn: 'root' })
export class InvoiceService extends BaseHttpService {
  private readonly API_URL = `${environment.urlBackend}api/suppliers/invoices`;
  private readonly PRODUCTS_URL = `${environment.urlBackend}api/products`;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Crea una factura manualmente
   * POST /api/suppliers/invoices
   * Nota: Las facturas normalmente se crean automáticamente al analizar documentos
   */
  createInvoice(invoice: CreateInvoiceDto): Observable<Invoice> {
    return this.post<Invoice>(`${this.API_URL}`, invoice);
  }

  /**
   * Obtiene todas las facturas de la empresa del usuario autenticado
   * GET /api/suppliers/invoices
   * @param restaurantId Filtro opcional por restaurante
   */
  getInvoices(restaurantId?: string): Observable<Invoice[]> {
    const url = restaurantId ? `${this.API_URL}?restaurantId=${restaurantId}` : this.API_URL;
    return this.get<Invoice[]>(url);
  }

  /**
   * Obtiene una factura por su ID
   * GET /api/suppliers/invoices/:id
   */
  getInvoiceById(id: string): Observable<Invoice> {
    return this.get<Invoice>(`${this.API_URL}/${id}`);
  }

  /**
   * Elimina una factura
   * DELETE /api/suppliers/invoices/:id
   */
  deleteInvoice(id: string): Observable<void> {
    return this.delete<void>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una factura
   * PATCH /api/suppliers/invoices/:id
   */
  updateInvoice(id: string, invoice: Partial<CreateInvoiceDto>): Observable<Invoice> {
    return this.put<Invoice>(`${this.API_URL}/${id}`, invoice);
  }

  /**
   * Descarga un ZIP con las imágenes de las facturas seleccionadas
   * POST /api/exportar-facturas-zip
   */
  descargarZipFacturas(facturas: Invoice[]): Observable<Blob> {
    return this.postBlob(`${environment.urlBackend}api/exportar-facturas-zip`, { facturas });
  }

  /**
   * Envía facturas por correo electrónico
   * POST /api/enviar-facturas-por-correo
   */
  enviarFacturasPorCorreo(facturas: Invoice[], email: string): Observable<any> {
    return this.post<any>(`${environment.urlBackend}api/enviar-facturas-por-correo`, { facturas, email });
  }

  /**
   * Obtiene la URL temporal del documento original de la factura
   * GET /api/suppliers/invoices/:id/document-url?expiresInHours=24
   */
  getDocumentUrl(id: string, expiresInHours: number = 24): Observable<DocumentUrlResponse> {
    return this.get<DocumentUrlResponse>(`${this.API_URL}/${id}/document-url?expiresInHours=${expiresInHours}`);
  }

  /**
   * Obtiene todos los productos del inventario consolidado
   * GET /api/products
   */
  getProducts(): Observable<Product[]> {
    return this.get<Product[]>(this.PRODUCTS_URL);
  }

  /**
   * Obtiene un producto específico por su ID
   * GET /api/products/:id
   */
  getProductById(id: string): Observable<Product> {
    return this.get<Product>(`${this.PRODUCTS_URL}/${id}`);
  }

  /**
   * Elimina un producto por su ID
   * DELETE /api/products/:id
   */
  deleteProduct(id: string): Observable<void> {
    return this.delete<void>(`${this.PRODUCTS_URL}/${id}`);
  }
}
