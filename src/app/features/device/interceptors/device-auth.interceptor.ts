import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { DeviceSessionService } from '../services/device-session.service';
import { POS_AUTH_MODE } from './pos-auth.context';

export const deviceAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const mode = req.context.get(POS_AUTH_MODE);

  if (mode === 'HUMAN') {
    return next(req);
  }

  if (mode === 'PUBLIC') {
    return next(req.clone({ headers: req.headers.delete('Authorization') }));
  }

  const session = inject(DeviceSessionService);
  const token = mode === 'DEVICE' ? session.deviceToken() : session.operatorToken();

  if (!token) {
    void inject(Router).navigate(['/dispositivo']);
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 401,
          statusText: mode === 'DEVICE' ? 'Device token unavailable' : 'Operator token unavailable',
          url: req.url
        })
    );
  }

  const scheme = mode === 'DEVICE' ? 'Device' : 'DeviceEmployee';
  return next(req.clone({ setHeaders: { Authorization: `${scheme} ${token}` } }));
};
