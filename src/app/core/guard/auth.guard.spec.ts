import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthService } from '../../features/auth/services/auth-service.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('sends the requested internal route to login when authentication is required', () => {
    const redirect = {} as UrlTree;
    const router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    router.createUrlTree.and.returnValue(redirect);
    auth.isAuthenticated.and.returnValue(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth }
      ]
    });

    const state = { url: '/ventas/configuracion/dispositivos/emparejar?code=ABCD-EFGH' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, state));

    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    expect(result).toBe(redirect);
  });
});
