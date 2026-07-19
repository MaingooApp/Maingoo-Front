import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

import { BaseHttpService } from '@app/core/services/base-http.service';

export interface AuditChange {
  field: string;
  type: 'TOUCHED' | 'VALUE' | 'COLLECTION';
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
  added?: string[];
  removed?: string[];
}

export interface AuditLogItem {
  id: string;
  correlationId: string;
  actorEmail?: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceLabel?: string;
  channel: 'HTTP' | 'AGENT' | 'AUTOMATION' | 'WEBHOOK' | 'CRON';
  sourceService: string;
  status: 'SUCCEEDED' | 'FAILED';
  changes: AuditChange[];
  metadata?: Record<string, unknown>;
  httpStatus?: number;
  errorCode?: string;
  occurredAt: string;
}

export interface AuditLogFilters {
  cursor?: string;
  action?: string;
  resourceType?: string;
  status?: string;
  from?: string;
  to?: string;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
  nextCursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService extends BaseHttpService {
  private readonly apiUrl = `${environment.urlBackend}api/audit-logs`;

  constructor(http: HttpClient) {
    super(http);
  }

  list(filters: AuditLogFilters): Observable<AuditLogsResponse> {
    let params = new HttpParams().set('limit', 50);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.get<AuditLogsResponse>(this.apiUrl, undefined, params);
  }
}
