import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { POS_AUTH_MODE } from '../../features/device/interceptors/pos-auth.context';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  if (req.context.get(POS_AUTH_MODE) !== 'HUMAN' || req.headers.has('Authorization')) {
    return next(req);
  }

  const accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return next(clonedReq);
  }

  return next(req);
};
