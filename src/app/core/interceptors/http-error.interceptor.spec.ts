import { HttpContext, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SubscriptionStateService } from '@features/billing/services/subscription-state.service';
import { AuthService } from '../../features/auth/services/auth-service.service';
import { POS_AUTH_MODE } from '../../features/device/interceptors/pos-auth.context';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  it('does not refresh the human session after a device 401', () => {
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['refreshAccessToken', 'logout']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        {
          provide: SubscriptionStateService,
          useValue: jasmine.createSpyObj<SubscriptionStateService>('SubscriptionStateService', ['markPaymentRequired'])
        }
      ]
    });

    const error = new HttpErrorResponse({ status: 401 });
    const request = new HttpRequest('GET', '/api/pos/device-context', {
      context: new HttpContext().set(POS_AUTH_MODE, 'DEVICE')
    });
    let received: HttpErrorResponse | undefined;

    TestBed.runInInjectionContext(() =>
      httpErrorInterceptor(request, () => throwError(() => error)).subscribe({
        error: (response) => (received = response)
      })
    );

    expect(received).toBe(error);
    expect(authService.refreshAccessToken).not.toHaveBeenCalled();
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('preserves the protected route when an expired human session returns 401', () => {
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRefreshToken', 'logout']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      url: '/ventas/configuracion/dispositivos/emparejar?userCode=ABCD-EFGH'
    });
    authService.getRefreshToken.and.returnValue(null);
    authService.logout.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: SubscriptionStateService,
          useValue: jasmine.createSpyObj<SubscriptionStateService>('SubscriptionStateService', ['markPaymentRequired'])
        }
      ]
    });

    const error = new HttpErrorResponse({ status: 401 });
    const request = new HttpRequest('GET', '/api/pos/device-pairings/lookup');

    TestBed.runInInjectionContext(() =>
      httpErrorInterceptor(request, () => throwError(() => error)).subscribe({ error: () => undefined })
    );

    expect(router.navigate).toHaveBeenCalledOnceWith(['/auth/login'], {
      queryParams: { returnUrl: router.url }
    });
  });
});
