import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject, filter, take, switchMap, catchError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth-service.service';
import { Router } from '@angular/router';
import { SubscriptionStateService } from '@features/billing/services/subscription-state.service';
import { safeInternalReturnUrl } from '../guard/safe-return-url';
import { POS_AUTH_MODE } from '../../features/device/interceptors/pos-auth.context';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const subscriptionState = inject(SubscriptionStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 402) {
        subscriptionState.markPaymentRequired();
      }

      if (error.status === 401) {
        if (req.context.get(POS_AUTH_MODE) !== 'HUMAN') {
          return throwError(() => error);
        }

        // Si la petición es al endpoint de refresh, no intentar refrescar
        if (req.url.includes('/auth/refresh')) {
          isRefreshing = false;
          authService.logout().subscribe(() => {
            navigateToLogin(router);
          });
          return throwError(() => error);
        }

        return handle401Error(req, next, authService, router);
      }

      return throwError(() => error);
    })
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authService.getRefreshToken();

    if (!refreshToken) {
      isRefreshing = false;
      authService.logout().subscribe(() => {
        navigateToLogin(router);
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
          navigateToLogin(router);
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

function navigateToLogin(router: Router): void {
  const returnUrl = safeInternalReturnUrl(router.url);
  const path = returnUrl?.split(/[?#]/, 1)[0];
  const queryParams = returnUrl && path !== '/auth' && !path?.startsWith('/auth/') ? { returnUrl } : undefined;
  void router.navigate(['/auth/login'], { queryParams });
}

function addTokenToRequest(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
