import { Injectable, signal } from '@angular/core';

export type PosTelemetryPhase = 'COMMAND' | 'OPERATIONAL' | 'STORAGE';

export type PosTelemetryEvent =
  | {
      readonly type: 'SYNC_CYCLE';
      readonly occurredAt: string;
      readonly outcome: 'COMPLETED' | 'FAILED' | 'CANCELLED';
      readonly durationMs: number;
      readonly queuedCommands: number;
    }
  | {
      readonly type: 'SYNC_ERROR';
      readonly occurredAt: string;
      readonly phase: PosTelemetryPhase;
      readonly errorCode: string;
      readonly transient: boolean;
    };

const MAX_EVENTS = 100;
const SAFE_ERROR_CODES = new Set([
  'DEVICE_REVOKED',
  'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
  'INVALID_SYNC_CURSOR',
  'ORDER_VERSION_CONFLICT',
  'POS_DISABLED',
  'POS_OFFLINE_COMMAND_NOT_FOUND',
  'POS_OFFLINE_DEVICE_NOT_FOUND',
  'POS_OFFLINE_LINE_RETARGET_AMBIGUOUS',
  'POS_OFFLINE_NAMESPACE_MISMATCH',
  'POS_OFFLINE_NAMESPACE_REQUIRED',
  'POS_OFFLINE_ORDER_SNAPSHOT_MISSING',
  'POS_OFFLINE_RETARGET_REQUIRED',
  'POS_OFFLINE_SENSITIVE_COMMAND_NOT_ALLOWED',
  'POS_OFFLINE_STORAGE_BLOCKED',
  'POS_OFFLINE_STORAGE_FAILED',
  'POS_OFFLINE_STORAGE_QUOTA_EXCEEDED',
  'POS_OFFLINE_STORAGE_UNAVAILABLE',
  'POS_SYNC_COMMAND_REJECTED',
  'POS_SYNC_CURSOR_STALLED',
  'POS_SYNC_FAILED',
  'POS_SYNC_TRANSIENT_ERROR',
  'UPSTREAM_FAILED'
]);

@Injectable({ providedIn: 'root' })
export class PosTelemetryService {
  private readonly eventState = signal<readonly PosTelemetryEvent[]>([]);
  readonly events = this.eventState.asReadonly();

  recordSyncCycle(
    outcome: Extract<PosTelemetryEvent, { type: 'SYNC_CYCLE' }>['outcome'],
    durationMs: number,
    queuedCommands: number
  ): void {
    this.append({
      type: 'SYNC_CYCLE',
      occurredAt: new Date().toISOString(),
      outcome,
      durationMs: safeInteger(durationMs),
      queuedCommands: safeInteger(queuedCommands)
    });
  }

  recordSyncError(phase: PosTelemetryPhase, errorCode: string | undefined, transient: boolean): void {
    this.append({
      type: 'SYNC_ERROR',
      occurredAt: new Date().toISOString(),
      phase,
      errorCode: errorCode && SAFE_ERROR_CODES.has(errorCode) ? errorCode : 'UNKNOWN_ERROR',
      transient
    });
  }

  snapshot(): readonly PosTelemetryEvent[] {
    return this.eventState().map((event) => ({ ...event }));
  }

  clear(): void {
    this.eventState.set([]);
  }

  private append(event: PosTelemetryEvent): void {
    this.eventState.update((events) => [...events, event].slice(-MAX_EVENTS));
  }
}

function safeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
