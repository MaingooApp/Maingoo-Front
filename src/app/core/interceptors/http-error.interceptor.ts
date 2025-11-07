import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject, filter, take, switchMap, catchError } from 'rxjs';
import { AuthService } from '../services/auth-service.service';
import { Router } from '@angular/router';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const httpErrorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            console.error('🔴 Error capturado por interceptor:', error);

            if (error.status === 401) {
                console.warn('⚠️ No autorizado (401)');

                // Si la petición es al endpoint de refresh, no intentar refrescar
                if (req.url.includes('/auth/refresh')) {
                    isRefreshing = false;
                    authService.logout().subscribe(() => {
                        router.navigate(['/auth/login']);
                    });
                    return throwError(() => error);
                }

                return handle401Error(req, next, authService, router);
            } else if (error.status === 0) {
                console.warn('⚠️ Sin conexión con el servidor');
            }

            return throwError(() => error);
        })
    );
};

function handle401Error(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService, router: Router): Observable<HttpEvent<unknown>> {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        const refreshToken = authService.getRefreshToken();

        if (!refreshToken) {
            isRefreshing = false;
            authService.logout().subscribe(() => {
                router.navigate(['/auth/login']);
            });
            return throwError(() => new Error('No refresh token available'));
        }

        return authService.refreshAccessToken().pipe(
            switchMap((tokens) => {
                isRefreshing = false;
                refreshTokenSubject.next(tokens.accessToken);

                // Reintenta la petición original con el nuevo token
                return next(addTokenToRequest(req, tokens.accessToken));
            }),
            catchError((err) => {
                isRefreshing = false;
                authService.logout().subscribe(() => {
                    router.navigate(['/auth/login']);
                });
                return throwError(() => err);
            })
        );
    } else {
        // Si ya se está refrescando el token, encolar la petición
        return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
                // Reintenta la petición con el nuevo token
                return next(addTokenToRequest(req, token!));
            })
        );
    }
}

function addTokenToRequest(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
}
