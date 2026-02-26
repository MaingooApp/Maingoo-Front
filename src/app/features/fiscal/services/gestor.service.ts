import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BaseHttpService } from '../../../core/services/base-http.service';
import { Gestor, CreateGestorDto, UpdateGestorDto } from '../interfaces/gestor.interface';

@Injectable({
  providedIn: 'root'
})
export class GestorService extends BaseHttpService {
  private readonly API_URL = `${environment.urlBackend}api/gestors`;

  constructor(http: HttpClient) {
    super(http);
  }

  getGestors(): Observable<Gestor[]> {
    return this.get<Gestor[]>(this.API_URL);
  }

  getGestorById(id: string): Observable<Gestor> {
    return this.get<Gestor>(`${this.API_URL}/${id}`);
  }

  createGestor(dto: CreateGestorDto): Observable<Gestor> {
    return this.post<Gestor>(this.API_URL, dto);
  }

  updateGestor(id: string, dto: UpdateGestorDto): Observable<Gestor> {
    return this.patch<Gestor>(`${this.API_URL}/${id}`, dto);
  }

  deleteGestor(id: string): Observable<void> {
    return this.delete<void>(`${this.API_URL}/${id}`);
  }
}
