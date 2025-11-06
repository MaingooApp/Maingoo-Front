import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    // Obtener el accessToken del localStorage
    const accessToken = localStorage.getItem('accessToken');

    // Si existe el token, clonar la petición y añadir el header de autorización
    if (accessToken) {
        const clonedReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        return next(clonedReq);
    }

    // Si no hay token, continuar con la petición original
    return next(req);
};
