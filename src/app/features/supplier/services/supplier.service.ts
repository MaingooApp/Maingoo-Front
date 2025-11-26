import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../../../core/services/base-http.service';
import { environment } from '../../../../environments/environment';

export interface Supplier {
    id?: string;
    name: string;
    cifNif: string;
    address?: string | null;
    phoneNumber?: string | null;
    commercialName?: string | null;
    commercialPhoneNumber?: string | null;
    deliveryDays?: string | null;
    minPriceDelivery?: number | null;
    sanitaryRegistrationNumber?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateSupplierDto {
    name: string;
    cifNif: string;
    address?: string;
    phoneNumber?: string;
    commercialName?: string;
    commercialPhoneNumber?: string;
    deliveryDays?: string;
    minPriceDelivery?: number;
    sanitaryRegistrationNumber?: string;
}

export interface UpdateSupplierDto {
    name?: string;
    cifNif?: string;
    address?: string;
    phoneNumber?: string;
    commercialName?: string;
    commercialPhoneNumber?: string;
    deliveryDays?: string;
    minPriceDelivery?: number;
    sanitaryRegistrationNumber?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SupplierService extends BaseHttpService {
    private readonly API_URL = `${environment.urlBackend}api/suppliers`;

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
