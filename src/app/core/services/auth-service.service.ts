import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface User {
    uid: string;
    email: string;
    rol: string;
    negocioId: string;
    createdAt?: Date;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface RegisterResponse {
    user: User;
    negocioId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService extends BaseHttpService {
    private readonly API_URL = `${environment.urlBackend}api/auth`;
    private userSubject = new BehaviorSubject<User | null>(null);
    public authState$ = this.userSubject.asObservable();

    constructor(http: HttpClient) {
        super(http);
        this.loadUserFromStorage();
    }

    private loadUserFromStorage(): void {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                this.userSubject.next(user);
            } catch (error) {
                console.error('Error al cargar usuario del storage:', error);
                this.clearStorage();
            }
        }
    }

    private saveToStorage(token: string, user: User): void {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    private clearStorage(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    get currentUser(): User | null {
        return this.userSubject.value;
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    login(email: string, password: string): Observable<LoginResponse> {
        return this.post<LoginResponse>(`${this.API_URL}/login`, { email, password }).pipe(
            tap((response) => {
                this.saveToStorage(response.token, response.user);
                this.userSubject.next(response.user);
            })
        );
    }

    logout(): Observable<void> {
        return new Observable((observer) => {
            this.clearStorage();
            this.userSubject.next(null);
            observer.next();
            observer.complete();
        });
    }

    register(email: string, password: string, esAdmin = false, negocioId?: string): Observable<RegisterResponse> {
        const body = {
            email,
            password,
            esAdmin,
            negocioId
        };
        return this.post<RegisterResponse>(`${this.API_URL}/register`, body).pipe(
            tap((response) => {
                // Opcionalmente podrías auto-loguear al usuario después del registro
                // this.saveToStorage(response.token, response.user);
                // this.userSubject.next(response.user);
            })
        );
    }

    getUserRole(uid: string): Observable<string | null> {
        return this.get<{ rol: string | null }>(`${this.API_URL}/users/${uid}/role`).pipe(map((response) => response.rol)) as Observable<string | null>;
    }

    getNegocioId(): Observable<string | null> {
        const uid = this.currentUser?.uid;
        if (!uid) {
            return new Observable((observer) => {
                observer.next(null);
                observer.complete();
            });
        }

        return this.get<{ negocioId: string | null }>(`${this.API_URL}/users/${uid}/negocio`).pipe(map((response) => response.negocioId)) as Observable<string | null>;
    }

    isAuthenticated(): boolean {
        return !!this.getToken() && !!this.currentUser;
    }
}
