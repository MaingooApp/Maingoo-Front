import { HttpContext, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { POS_AUTH_MODE } from '../../features/device/interceptors/pos-auth.context';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  beforeEach(() => localStorage.setItem('accessToken', 'human-token'));
  afterEach(() => localStorage.removeItem('accessToken'));

  it('does not add Bearer to public requests', () => {
    const request = new HttpRequest('GET', '/api/public', {
      context: new HttpContext().set(POS_AUTH_MODE, 'PUBLIC')
    });
    let handled: HttpRequest<unknown> | undefined;

    authInterceptor(request, (nextRequest) => {
      handled = nextRequest;
      return of(new HttpResponse());
    }).subscribe();

    expect(handled?.headers.has('Authorization')).toBeFalse();
  });

  it('keeps an existing authorization scheme', () => {
    const request = new HttpRequest('GET', '/api/pos', {
      headers: new HttpHeaders({ Authorization: 'Device device-token' })
    });
    let handled: HttpRequest<unknown> | undefined;

    authInterceptor(request, (nextRequest) => {
      handled = nextRequest;
      return of(new HttpResponse());
    }).subscribe();

    expect(handled?.headers.get('Authorization')).toBe('Device device-token');
  });
});
