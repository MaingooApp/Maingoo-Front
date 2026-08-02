import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { AppPermission } from '@core/constants/permissions.enum';
import { AuthService } from '@features/auth/services/auth-service.service';

import { requireAllPermissions } from './permissions.guard';

describe('requireAllPermissions', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let redirect: UrlTree;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['hasPermission']);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    redirect = {} as UrlTree;
    router.createUrlTree.and.returnValue(redirect);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('redirects a cashier away from the dashboard to the cash register', () => {
    const cashierPermissions = [AppPermission.PosRead, AppPermission.PosSell, AppPermission.PosCash];
    authService.hasPermission.and.callFake((permission) => cashierPermissions.includes(permission as AppPermission));

    const result = TestBed.runInInjectionContext(() =>
      requireAllPermissions(AppPermission.InvoicesRead, AppPermission.SuppliersRead)({} as never, {} as never)
    );

    expect(result).toBe(redirect);
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/ventas/caja']);
  });

  it('allows a user that has every required permission', () => {
    authService.hasPermission.and.callFake(
      (permission) => permission === AppPermission.InvoicesRead || permission === AppPermission.SuppliersRead
    );

    const result = TestBed.runInInjectionContext(() =>
      requireAllPermissions(AppPermission.InvoicesRead, AppPermission.SuppliersRead)({} as never, {} as never)
    );

    expect(result).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });
});
