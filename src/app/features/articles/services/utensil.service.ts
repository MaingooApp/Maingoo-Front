import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@app/core/services/base-http.service';
import { environment } from '../../../../environments/environment';
import { Utensil } from '../interfaces/food-preparation.interfaces';

@Injectable({ providedIn: 'root' })
export class UtensilService extends BaseHttpService {
  private readonly BASE_URL = `${environment.urlBackend}api/food-preparations/utensils`;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Obtiene todos los utensilios (globales + propios de la empresa)
   * GET /api/food-preparations/utensils
   */
  getUtensils(): Observable<Utensil[]> {
    return this.get<Utensil[]>(this.BASE_URL);
  }

  /**
   * Crea un utensilio para la empresa del usuario autenticado
   * POST /api/food-preparations/utensils
   */
  createUtensil(name: string): Observable<Utensil> {
    return this.post<Utensil>(this.BASE_URL, { name });
  }
}
