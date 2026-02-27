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

  /**
   * Actualiza un utensilio
   * PATCH /api/food-preparations/utensils/:id
   */
  updateUtensil(id: string, name: string): Observable<Utensil> {
    return this.patch<Utensil>(`${this.BASE_URL}/${id}`, { name });
  }

  /**
   * Elimina un utensilio
   * DELETE /api/food-preparations/utensils/:id
   */
  deleteUtensil(id: string): Observable<void> {
    return this.delete<void>(`${this.BASE_URL}/${id}`);
  }
}
