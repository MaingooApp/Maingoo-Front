import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { POS_AUTH_MODE } from '../interceptors/pos-auth.context';
import {
  ApproveDevicePairingRequest,
  CreatePosEmployeeSessionResponse,
  CreateDevicePairingRequest,
  DeniedDevicePairing,
  DenyDevicePairingRequest,
  DevicePairingChallenge,
  DeviceContext,
  DevicePairingExchange,
  DevicePairingLookup,
  LogoutPosEmployeeSessionResponse,
  PosEmployeeSession
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

  getContext(): Observable<DeviceContext> {
    return this.http.get<DeviceContext>(`${environment.urlBackend}api/pos/device-context`, {
      context: new HttpContext().set(POS_AUTH_MODE, 'DEVICE')
    });
  }

  createEmployeeSession(pin: string): Observable<PosEmployeeSession> {
    return this.http
      .post<CreatePosEmployeeSessionResponse>(
        `${environment.urlBackend}api/pos/device-session/employee`,
        { pin },
        { context: new HttpContext().set(POS_AUTH_MODE, 'DEVICE') }
      )
      .pipe(
        map((response) => ({
          user: { id: response.employee.userId, name: response.employee.name },
          permissions: response.employee.permissions,
          operatorToken: response.operatorToken,
          expiresAt: response.expiresAt
        }))
      );
  }

  logoutEmployeeSession(): Observable<LogoutPosEmployeeSessionResponse> {
    return this.http.post<LogoutPosEmployeeSessionResponse>(
      `${environment.urlBackend}api/pos/device-session/logout`,
      {},
      { context: new HttpContext().set(POS_AUTH_MODE, 'DEVICE_EMPLOYEE') }
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
