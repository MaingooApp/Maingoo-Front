import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { LoginResponse } from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth-service.service';
import { Login } from './login.component';

describe('Login return URL', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    auth.login.and.returnValue(of(loginResponse()));
    router.navigateByUrl.and.resolveTo(true);
  });

  it('returns to QR approval after a successful login', () => {
    const returnUrl = '/ventas/configuracion/dispositivos/emparejar?code=ABCD-EFGH';
    const component = createLogin(returnUrl);

    submitValidForm(component);

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith(returnUrl);
  });

  it('falls back to home instead of following an external return URL', () => {
    const component = createLogin('//evil.example/steal-session');

    submitValidForm(component);

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });

  function createLogin(returnUrl: string): Login {
    const route = {
      snapshot: { queryParamMap: convertToParamMap({ returnUrl }) }
    } as unknown as ActivatedRoute;
    const component = TestBed.runInInjectionContext(() => new Login(new FormBuilder(), auth, router, route));
    component.ngOnInit();
    return component;
  }
});

function submitValidForm(component: Login): void {
  component.loginForm.setValue({ email: 'admin@maingoo.tech', password: 'password', rememberMe: false });
  void component.onSubmit();
}

function loginResponse(): LoginResponse {
  return {
    user: {
      id: 'user-1',
      email: 'admin@maingoo.tech',
      name: 'Admin',
      permissions: ['pos.manage'],
      enterpriseId: 'enterprise-1',
      phonePrefix: null,
      phoneNumber: null,
      emailFluvia: null,
      createdAt: '2026-07-29T10:00:00.000Z'
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: '900',
      refreshExpiresIn: '86400'
    }
  };
}
