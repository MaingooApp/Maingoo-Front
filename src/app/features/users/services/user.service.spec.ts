import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { POS_AUTH_MODE } from '../../device/interceptors/pos-auth.context';
import { UserService } from './user.service';

describe('UserService POS PIN', () => {
  let service: UserService;
  let http: HttpTestingController;
  const apiUrl = `${environment.urlBackend}api/auth/users/user-1/pos-pin`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sets a PIN with explicit human authentication', () => {
    service.setPosPin('user-1', '4826').subscribe();

    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ pin: '4826' });
    expect(request.request.context.get(POS_AUTH_MODE)).toBe('HUMAN');
    request.flush({ userId: 'user-1', posPinConfigured: true, updatedAt: '2026-07-29T10:00:00.000Z' });
  });

  it('disables a PIN without sending its value', () => {
    service.disablePosPin('user-1').subscribe();

    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    expect(request.request.context.get(POS_AUTH_MODE)).toBe('HUMAN');
    request.flush({ userId: 'user-1', posPinConfigured: false, updatedAt: '2026-07-29T10:00:00.000Z' });
  });
});
