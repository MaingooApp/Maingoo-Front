import { HttpContext, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { DeviceSessionService } from '../services/device-session.service';
import { deviceAuthInterceptor } from './device-auth.interceptor';
import { POS_AUTH_MODE } from './pos-auth.context';

describe('deviceAuthInterceptor', () => {
  const session = {
    deviceToken: jasmine.createSpy().and.returnValue('device-token'),
    operatorToken: jasmine.createSpy().and.returnValue('operator-token')
  };
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);

  beforeEach(() => {
    session.deviceToken.calls.reset();
    session.deviceToken.and.returnValue('device-token');
    session.operatorToken.calls.reset();
    session.operatorToken.and.returnValue('operator-token');
    router.navigate.calls.reset();
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: DeviceSessionService, useValue: session },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('applies the requested device authentication scheme', () => {
    const requests: HttpRequest<unknown>[] = [];

    for (const [mode, expected] of [
      ['DEVICE', 'Device device-token'],
      ['DEVICE_EMPLOYEE', 'DeviceEmployee operator-token']
    ] as const) {
      const request = new HttpRequest('GET', '/api/pos', {
        context: new HttpContext().set(POS_AUTH_MODE, mode)
      });

      TestBed.runInInjectionContext(() =>
        deviceAuthInterceptor(request, (handled) => {
          requests.push(handled);
          return of(new HttpResponse());
        }).subscribe()
      );
    }

    expect(requests.map((request) => request.headers.get('Authorization'))).toEqual([
      'Device device-token',
      'DeviceEmployee operator-token'
    ]);
  });

  it('removes authorization from public requests', () => {
    const request = new HttpRequest('GET', '/api/pos/device-pairings', {
      headers: new HttpHeaders({ Authorization: 'Bearer human-token' }),
      context: new HttpContext().set(POS_AUTH_MODE, 'PUBLIC')
    });
    let handled: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() =>
      deviceAuthInterceptor(request, (nextRequest) => {
        handled = nextRequest;
        return of(new HttpResponse());
      }).subscribe()
    );

    expect(handled?.headers.has('Authorization')).toBeFalse();
  });

  it('fails locally when the requested credential is unavailable', () => {
    session.operatorToken.and.returnValue(null);
    const request = new HttpRequest('GET', '/api/pos/orders', {
      context: new HttpContext().set(POS_AUTH_MODE, 'DEVICE_EMPLOYEE')
    });
    const next = jasmine.createSpy('next');
    let status: number | undefined;

    TestBed.runInInjectionContext(() =>
      deviceAuthInterceptor(request, next).subscribe({ error: (error) => (status = error.status) })
    );

    expect(status).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/dispositivo/terminal']);
  });
});
