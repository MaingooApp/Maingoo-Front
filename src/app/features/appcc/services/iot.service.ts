import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@app/core/services/base-http.service';
import { environment } from '../../../../environments/environment';

export type IotDeviceType =
  | 'TEMPERATURE'
  | 'HUMIDITY'
  | 'DOOR'
  | 'WATER_LEAK'
  | 'ELECTRICITY'
  | 'PREDICTIVE_MAINTENANCE';

export type IotDeviceStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
export type IotAlertStatus = 'ACTIVE' | 'RESOLVED';
export type IotAlertType = 'TEMPERATURE_HIGH' | 'BATTERY_LOW' | 'SENSOR_OFFLINE';
export type IotAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface IotDevice {
  id: string;
  enterpriseId: string;
  gatewayId?: string | null;
  deviceId: string;
  devEui: string;
  name: string;
  type: IotDeviceType;
  model?: string | null;
  locationName?: string | null;
  status: IotDeviceStatus;
  metadata?: Record<string, unknown> | null;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IotReading {
  id: string;
  enterpriseId: string;
  deviceId: string;
  temperatureC?: number | string | null;
  batteryPct?: number | null;
  rawPayload?: string | null;
  rawBody?: Record<string, unknown> | null;
  sourceEventId?: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface IotAlert {
  id: string;
  enterpriseId: string;
  deviceId: string;
  type: IotAlertType;
  severity: IotAlertSeverity;
  status: IotAlertStatus;
  message: string;
  openedAt: string;
  resolvedAt?: string | null;
}

export interface IotDeviceFilters {
  status?: IotDeviceStatus;
  type?: IotDeviceType;
}

export interface IotReadingFilters {
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface IotAlertFilters {
  deviceId?: string;
  status?: IotAlertStatus;
  type?: IotAlertType;
}

@Injectable({ providedIn: 'root' })
export class IotService extends BaseHttpService {
  private readonly BASE_URL = `${environment.urlBackend}api/iot`;

  constructor(http: HttpClient) {
    super(http);
  }

  getDevices(filters: IotDeviceFilters = {}): Observable<IotDevice[]> {
    return this.get<IotDevice[]>(`${this.BASE_URL}/devices`, undefined, this.toParams(filters));
  }

  getDeviceReadings(deviceId: string, filters: Omit<IotReadingFilters, 'deviceId'> = {}): Observable<IotReading[]> {
    return this.get<IotReading[]>(
      `${this.BASE_URL}/devices/${deviceId}/readings`,
      undefined,
      this.toParams(filters)
    );
  }

  getAlerts(filters: IotAlertFilters = {}): Observable<IotAlert[]> {
    return this.get<IotAlert[]>(`${this.BASE_URL}/alerts`, undefined, this.toParams(filters));
  }

  private toParams(filters: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if ((typeof value === 'string' || typeof value === 'number') && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
