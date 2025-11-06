// invoice.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Servicio para gestionar facturas
 * Endpoints: /api/suppliers/invoices/*
 */
@Injectable({ providedIn: 'root' })
export class InvoiceService extends BaseHttpService {
    private readonly API_URL = `${environment.urlBackend}api/suppliers/invoices`;

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
}

/**
 * Interfaces basadas en la API real
 */
export interface CreateInvoiceDto {
    enterpriseId: string;
    supplierName: string;
    supplierCifNif: string;
    invoiceNumber: string;
    date: string; // ISO 8601 format
    amount: number;
    lines: InvoiceLine[];
}

export interface InvoiceLine {
    description: string;
    quantity: number;
    unitPrice: number;
    tax: string;
}

export interface Invoice {
    id: string;
    enterpriseId: string;
    supplierName: string;
    supplierCifNif: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    lines: InvoiceLine[];
    createdAt: string;
    updatedAt: string;
}
