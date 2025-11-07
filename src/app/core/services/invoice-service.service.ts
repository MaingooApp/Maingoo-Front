// factura.service.ts
import { Injectable } from '@angular/core';
import { AuthService } from './auth-service.service';
import { map, Observable } from 'rxjs';
import { Invoice, InvoiceFromBackend } from '../interfaces/Invoice.interfaces';
import { BaseHttpService } from './base-http.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvoiceService extends BaseHttpService {
    private readonly API_URL = `${environment.urlBackend}api/suppliers/invoices`;

    constructor(
        private authService: AuthService,
        http: HttpClient
    ) {
        super(http);
    }

    saveInvoice(resultado: any): Observable<{ id: string }> {
        const user = this.authService.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        const facturaId = resultado.factura.numero.replace(/[^\w\-]/g, '');
        resultado.factura.numero = facturaId;

        const data = {
            proveedor: resultado.proveedor,
            factura: resultado.factura,
            productos: resultado.productos,
            subidoPor: user.id,
            fechaSubida: new Date(),
            imagen: resultado.imagen,
            mimeType: resultado.mimeType
        };

        return this.post<{ id: string }>(`${this.API_URL}`, data);
    }

    getFacturas(): Observable<InvoiceFromBackend[]> {
        return this.get<InvoiceFromBackend[]>(`${this.API_URL}`);
    }

    getFacturaById(id: string): Observable<InvoiceFromBackend> {
        return this.get<InvoiceFromBackend>(`${this.API_URL}/${id}`);
    }

    eliminarFactura(id: string): Observable<void> {
        return this.delete<void>(`${this.API_URL}/${id}`);
    }

    getProductosInventario(): Observable<any[]> {
        return this.get<any[]>(`${this.API_URL}/productos-inventario`).pipe(
            map((productos: any[]) =>
                productos.map((producto) => ({
                    ...producto,
                    precio: this.convertToDecimal(producto.precio),
                    cantidad: this.convertToDecimal(producto.cantidad),
                    fechaFactura: this.convertToDate(producto.fechaFactura)
                }))
            )
        );
    }

    indexarProductos(productos: any[], proveedor: { nombre: string; nif: string }, fechaFactura: string | Date): Observable<void> {
        const data = {
            productos,
            proveedor,
            fechaFactura
        };
        return this.post<void>(`${this.API_URL}/indexar-productos`, data);
    }

    private convertToDecimal(value: any): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const sanitized = value.replace(',', '.');
            const parsed = parseFloat(sanitized);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    private convertToDate(value: any): Date | null {
        if (value instanceof Date) return value;

        if (value?.seconds) return new Date(value.seconds * 1000);

        if (typeof value === 'string') {
            const [fecha, hora] = value.split(' ');
            const [dia, mes, anio] = fecha.split('/').map(Number);
            const [h, m] = hora?.split(':').map(Number) ?? [0, 0];
            return new Date(anio, mes - 1, dia, h, m);
        }

        return null;
    }

    eliminarProductoInventario(productoId: string): Observable<void> {
        return this.delete<void>(`${this.API_URL}/productos-inventario/${productoId}`);
    }

    descargarZipFacturas(facturas: any[]): Observable<Blob> {
        return this.postBlob(`${environment.urlBackend}api/exportar-facturas-zip`, { facturas });
    }

    enviarFacturasPorCorreo(facturas: any[], email: string): Observable<any> {
        return this.post<any>(`${environment.urlBackend}api/enviar-facturas-por-correo`, { facturas, email });
    }

    analizarProductosPorIA(productos: { descripcion: string }[]): Observable<any[]> {
        return this.post<{ productos: any[] }>(`${environment.urlBackend}api/analyze/alergenos`, { productos }).pipe(map((res) => res.productos));
    }
}
