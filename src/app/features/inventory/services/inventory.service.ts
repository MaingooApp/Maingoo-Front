import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseHttpService } from '@core/services/base-http.service';
import { environment } from '@env/environment';

import {
  ApplyInventoryMovementCommand,
  CompleteStockCountCommand,
  CompleteStockCountResponse,
  CreateStockCountCommand,
  InventorySummaryFilters,
  InventorySummaryResponse,
  StockCount,
  StockMovement,
  StockMovementFilters,
  StockMovementsResponse
} from '../models/inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryService extends BaseHttpService {
  private readonly apiUrl = `${environment.urlBackend}api/inventory`;

  constructor(http: HttpClient) {
    super(http);
  }

  getSummary(filters: InventorySummaryFilters = {}): Observable<InventorySummaryResponse> {
    return this.get<InventorySummaryResponse>(`${this.apiUrl}/summary`, undefined, this.params(filters));
  }

  listMovements(filters: StockMovementFilters = {}): Observable<StockMovementsResponse> {
    return this.get<StockMovementsResponse>(`${this.apiUrl}/movements`, undefined, this.params(filters));
  }

  applyMovement(command: ApplyInventoryMovementCommand): Observable<StockMovement> {
    return this.post<StockMovement>(`${this.apiUrl}/movements`, command);
  }

  createCount(command: CreateStockCountCommand): Observable<StockCount> {
    return this.post<StockCount>(`${this.apiUrl}/counts`, command);
  }

  completeCount(countId: string, command: CompleteStockCountCommand): Observable<CompleteStockCountResponse> {
    return this.post<CompleteStockCountResponse>(`${this.apiUrl}/counts/${countId}/complete`, command);
  }

  private params(values: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return params;
  }
}
