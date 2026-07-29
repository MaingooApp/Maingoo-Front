import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { AppPermission } from '@core/constants/permissions.enum';
import { AuthService } from '@features/auth/services/auth-service.service';

import { cashierPermissionsGuard } from './cashier-permissions.guard';

describe('cashierPermissionsGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['hasPermission']);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue({} as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('requires read, sell and cash permissions together', () => {
    authService.hasPermission.and.callFake((permission) => permission !== AppPermission.PosSell);

    const result = TestBed.runInInjectionContext(() => cashierPermissionsGuard({} as never, {} as never));

    expect(result).toBe(router.createUrlTree.calls.mostRecent().returnValue);
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/ventas']);

    authService.hasPermission.and.returnValue(true);
    expect(TestBed.runInInjectionContext(() => cashierPermissionsGuard({} as never, {} as never))).toBeTrue();
  });
});
