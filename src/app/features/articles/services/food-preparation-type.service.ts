import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@app/core/services/base-http.service';
import { environment } from '../../../../environments/environment';
import { FoodPreparationType } from '../interfaces/food-preparation.interfaces';

@Injectable({ providedIn: 'root' })
export class FoodPreparationTypeService extends BaseHttpService {
  private readonly BASE_URL = `${environment.urlBackend}api/food-preparations/types`;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Obtiene todos los tipos de elaboración (catálogo global)
   * GET /api/food-preparations/types
   */
  getTypes(): Observable<FoodPreparationType[]> {
    return this.get<FoodPreparationType[]>(this.BASE_URL);
  }
}
