import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface User {
    id: string;
    email: string;
    name: string;
    roleId: string;
    roleName: string;
    enterpriseId: string;
    phonePrefix: string | null;
    phoneNumber: string | null;
    emailFluvia: string | null;
    createdAt: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    refreshExpiresIn: string;
}

export interface LoginResponse {
    user: User;
    tokens: AuthTokens;
}

export interface RegisterResponse {
    user: User;
    tokens: AuthTokens;
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
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');
        if (accessToken && refreshToken && userStr) {
            try {
                const user = JSON.parse(userStr);
                this.userSubject.next(user);
            } catch (error) {
                console.error('Error al cargar usuario del storage:', error);
                this.clearStorage();
            }
        }
    }

    private saveToStorage(tokens: AuthTokens, user: User): void {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('expiresIn', tokens.expiresIn);
        localStorage.setItem('refreshExpiresIn', tokens.refreshExpiresIn);
        localStorage.setItem('user', JSON.stringify(user));
    }

    private clearStorage(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresIn');
        localStorage.removeItem('refreshExpiresIn');
        localStorage.removeItem('user');
    }

    get currentUser(): User | null {
        return this.userSubject.value;
    }

    getToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refreshToken');
    }

    login(email: string, password: string): Observable<LoginResponse> {
        return this.post<LoginResponse>(`${this.API_URL}/login`, { email, password }).pipe(
            tap((response) => {
                this.saveToStorage(response.tokens, response.user);
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

    register(email: string, password: string, name: string): Observable<RegisterResponse> {
        const body = {
            email,
            password,
            name
        };
        return this.post<RegisterResponse>(`${this.API_URL}/register`, body).pipe(
            tap((response) => {
                // Opcionalmente podrías auto-loguear al usuario después del registro
                this.saveToStorage(response.tokens, response.user);
                this.userSubject.next(response.user);
            })
        );
    }

    getUserRole(): string | null {
        return this.currentUser?.roleName || null;
    }

    getEnterpriseId(): string | null {
        return this.currentUser?.enterpriseId || null;
    }

    getUserId(): string | null {
        return this.currentUser?.id || null;
    }

    getNegocioId(): Observable<string | null> {
        const enterpriseId = this.getEnterpriseId();
        return new Observable((observer) => {
            observer.next(enterpriseId);
            observer.complete();
        });
    }

    isAuthenticated(): boolean {
        return !!this.getToken() && !!this.currentUser;
    }

    refreshAccessToken(): Observable<AuthTokens> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        return this.post<{ tokens: AuthTokens }>(`${this.API_URL}/refresh`, {
            refreshToken
        }).pipe(
            map((response) => response.tokens),
            tap((tokens) => {
                localStorage.setItem('accessToken', tokens.accessToken);
                localStorage.setItem('refreshToken', tokens.refreshToken);
                localStorage.setItem('expiresIn', tokens.expiresIn);
                localStorage.setItem('refreshExpiresIn', tokens.refreshExpiresIn);
            })
        );
    }
}
