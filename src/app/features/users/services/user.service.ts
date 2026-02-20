import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BaseHttpService } from '../../../core/services/base-http.service';
import { ManagedUser, Permission } from '../interfaces/user-management.interface';

@Injectable({ providedIn: 'root' })
export class UserService extends BaseHttpService {
  private readonly API_URL = `${environment.urlBackend}api/auth`;

  constructor(http: HttpClient) {
    super(http);
  }

  getUsers(): Observable<ManagedUser[]> {
    return this.get<ManagedUser[]>(`${this.API_URL}/users`);
  }

  getAllPermissions(): Observable<Permission[]> {
    return this.get<Permission[]>(`${this.API_URL}/permissions`);
  }

  updateUserPermissions(userId: string, permissionIds: string[]): Observable<ManagedUser> {
    return this.http
      .patch<{ user: ManagedUser }>(`${this.API_URL}/users/${userId}/permissions`, { permissionIds })
      .pipe(map((response) => response.user));
  }

  createUser(data: {
    email: string;
    password: string;
    name: string;
    permissionIds?: string[];
  }): Observable<ManagedUser> {
    return this.post<{ user: ManagedUser }>(`${this.API_URL}/users`, data).pipe(map((response) => response.user));
  }

  deleteUser(userId: string): Observable<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`${this.API_URL}/users/${userId}`);
  }
}
