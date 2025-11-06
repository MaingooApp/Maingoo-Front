import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';

export interface Supplier {
    id: string;
    name: string;
    taxId: string;
    email?: string;
    phone?: string;
    address?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSupplierDto {
    name: string;
    taxId: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface UpdateSupplierDto {
    name?: string;
    taxId?: string;
    email?: string;
    phone?: string;
    address?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SupplierService extends BaseHttpService {
    private readonly API_URL = '/api/suppliers';

    createSupplier(data: CreateSupplierDto): Observable<Supplier> {
        return this.post<Supplier>(this.API_URL, data);
    }

    listSuppliers(): Observable<Supplier[]> {
        return this.get<Supplier[]>(this.API_URL);
    }

    getSupplierById(supplierId: string): Observable<Supplier> {
        return this.get<Supplier>(`${this.API_URL}/${supplierId}`);
    }

    updateSupplier(supplierId: string, data: UpdateSupplierDto): Observable<Supplier> {
        return this.put<Supplier>(`${this.API_URL}/${supplierId}`, data);
    }

    deleteSupplier(supplierId: string): Observable<void> {
        return this.delete<void>(`${this.API_URL}/${supplierId}`);
    }

    findByTaxId(taxId: string): Observable<Supplier | null> {
        return this.get<Supplier | null>(`${this.API_URL}/search?taxId=${taxId}`);
    }
}
