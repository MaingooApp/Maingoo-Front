import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../../../core/services/base-http.service';
import { environment } from '../../../../environments/environment';
import { CreateSupplierDto, Supplier, UpdateSupplierDto } from '../interfaces/supplier.interface';

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
    return this.http.patch<Supplier>(`${this.API_URL}/${supplierId}`, data, {
      headers: this.createHeaders()
    });
  }

  deleteSupplier(supplierId: string): Observable<void> {
    return this.delete<void>(`${this.API_URL}/${supplierId}`);
  }

  findByTaxId(taxId: string): Observable<Supplier | null> {
    return this.get<Supplier | null>(`${this.API_URL}/search?taxId=${taxId}`);
  }

  getPriceHistory(id: string): Observable<any> {
    return this.get<any>(`${this.API_URL}/products/${id}/price-history`);
  }
}
