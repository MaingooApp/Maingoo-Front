import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { POS_AUTH_MODE } from '../interceptors/pos-auth.context';
import {
  ApproveDevicePairingRequest,
  CreateDevicePairingRequest,
  DeniedDevicePairing,
  DenyDevicePairingRequest,
  DevicePairingChallenge,
  DevicePairingExchange,
  DevicePairingLookup
} from '../models/device-session.models';

@Injectable({ providedIn: 'root' })
export class DevicePairingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.urlBackend}api/pos/device-pairings`;
  private readonly publicContext = new HttpContext().set(POS_AUTH_MODE, 'PUBLIC');
  private readonly humanContext = new HttpContext().set(POS_AUTH_MODE, 'HUMAN');

  create(request: CreateDevicePairingRequest): Observable<DevicePairingChallenge> {
    return this.http.post<DevicePairingChallenge>(this.apiUrl, request, { context: this.publicContext });
  }

  exchange(deviceCode: string): Observable<DevicePairingExchange> {
    return this.http.post<DevicePairingExchange>(
      `${this.apiUrl}/token`,
      { deviceCode },
      { context: this.publicContext }
    );
  }

  lookup(userCode: string): Observable<DevicePairingLookup> {
    return this.http.get<DevicePairingLookup>(`${this.apiUrl}/lookup`, {
      context: this.humanContext,
      params: new HttpParams().set('userCode', userCode)
    });
  }

  approve(pairingId: string, request: ApproveDevicePairingRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${pairingId}/approve`, request, { context: this.humanContext });
  }

  deny(pairingId: string, request: DenyDevicePairingRequest): Observable<DeniedDevicePairing> {
    return this.http.post<DeniedDevicePairing>(`${this.apiUrl}/${pairingId}/deny`, request, {
      context: this.humanContext
    });
  }
}
