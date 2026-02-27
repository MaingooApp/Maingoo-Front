import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@app/core/services/base-http.service';
import { environment } from '../../../../environments/environment';
import { Machinery } from '../interfaces/food-preparation.interfaces';

@Injectable({ providedIn: 'root' })
export class MachineryService extends BaseHttpService {
  private readonly BASE_URL = `${environment.urlBackend}api/food-preparations/machinery`;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Obtiene toda la maquinaria (global + propia de empresa)
   * GET /api/food-preparations/machinery
   */
  getMachinery(): Observable<Machinery[]> {
    return this.get<Machinery[]>(this.BASE_URL);
  }

  /**
   * Crea una maquinaria para la empresa del usuario autenticado
   * POST /api/food-preparations/machinery
   */
  createMachinery(name: string): Observable<Machinery> {
    return this.post<Machinery>(this.BASE_URL, { name });
  }
}
