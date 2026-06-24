import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { BaseHttpService } from '@core/services/base-http.service';
import {
  BillingPortalResponse,
  CurrentSubscriptionResponse
} from '../interfaces/billing-subscription.interface';
import { SubscriptionStateService } from './subscription-state.service';

@Injectable({ providedIn: 'root' })
export class BillingService extends BaseHttpService {
  private readonly API_URL = `${environment.urlBackend}api/billing`;
  private readonly subscriptionState = inject(SubscriptionStateService);

  constructor(http: HttpClient) {
    super(http);
  }

  getCurrentSubscription(): Observable<CurrentSubscriptionResponse> {
    this.subscriptionState.setLoading(true);

    return this.get<CurrentSubscriptionResponse>(`${this.API_URL}/subscriptions/current`).pipe(
      tap((response) => this.subscriptionState.setCurrent(response)),
      catchError((error: unknown) => {
        this.subscriptionState.setError('No se pudo consultar el estado de la suscripcion.');
        return throwError(() => error);
      }),
      finalize(() => this.subscriptionState.setLoading(false))
    );
  }

  createPortalSession(returnUrl: string): Observable<BillingPortalResponse> {
    return this.post<BillingPortalResponse>(`${this.API_URL}/subscriptions/portal`, { returnUrl });
  }
}
