import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@app/core/services/base-http.service';
import { environment } from '../../../../environments/environment';
import {
  FoodPreparation,
  CreateFoodPreparationDto,
  UpdateFoodPreparationDto
} from '../interfaces/food-preparation.interfaces';

@Injectable({ providedIn: 'root' })
export class FoodPreparationService extends BaseHttpService {
  private readonly BASE_URL = `${environment.urlBackend}api/food-preparations`;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Obtiene todas las elaboraciones de la empresa autenticada
   * GET /api/food-preparations
   */
  getAll(): Observable<FoodPreparation[]> {
    return this.get<FoodPreparation[]>(this.BASE_URL);
  }

  /**
   * Obtiene una elaboración por ID (con todas sus relaciones)
   * GET /api/food-preparations/:id
   */
  getOne(id: string): Observable<FoodPreparation> {
    return this.get<FoodPreparation>(`${this.BASE_URL}/${id}`);
  }

  /**
   * Crea una nueva elaboración con sus ingredientes, utensilios y maquinaria
   * POST /api/food-preparations
   */
  create(dto: CreateFoodPreparationDto): Observable<FoodPreparation> {
    return this.post<FoodPreparation>(this.BASE_URL, dto);
  }

  /**
   * Actualiza una elaboración (replace strategy para relaciones)
   * PATCH /api/food-preparations/:id
   */
  update(id: string, dto: UpdateFoodPreparationDto): Observable<FoodPreparation> {
    return this.patch<FoodPreparation>(`${this.BASE_URL}/${id}`, dto);
  }

  /**
   * Elimina una elaboración
   * DELETE /api/food-preparations/:id
   */
  remove(id: string): Observable<void> {
    return this.delete<void>(`${this.BASE_URL}/${id}`);
  }
}
