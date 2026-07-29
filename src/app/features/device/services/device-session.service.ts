import { computed, inject, Injectable, signal } from '@angular/core';

import { PairedDeviceIdentity, PendingDevicePairing, PosEmployeeSession } from '../models/device-session.models';
import { DeviceSessionStorageError, DeviceSessionStorageService } from './device-session-storage.service';

@Injectable({ providedIn: 'root' })
export class DeviceSessionService {
  private readonly storage = inject(DeviceSessionStorageService);
  private readonly initializedState = signal(false);
  private readonly pairedIdentityState = signal<PairedDeviceIdentity | null>(null);
  private readonly operatorSessionState = signal<PosEmployeeSession | null>(null);
  private readonly pendingPairingState = signal<PendingDevicePairing | null>(null);
  private readonly storageErrorCodeState = signal<string | null>(null);
  private initialization: Promise<void> | null = null;

  readonly initialized = this.initializedState.asReadonly();
  readonly pairedIdentity = this.pairedIdentityState.asReadonly();
  readonly operatorSession = this.operatorSessionState.asReadonly();
  readonly pendingPairing = this.pendingPairingState.asReadonly();
  readonly storageErrorCode = this.storageErrorCodeState.asReadonly();
  readonly device = computed(() => this.pairedIdentity()?.device ?? null);
  readonly mode = computed(() => this.device()?.type ?? null);
  readonly deviceToken = computed(() => this.pairedIdentity()?.deviceToken ?? null);
  readonly operatorToken = computed(() => this.operatorSession()?.operatorToken ?? null);
  readonly isPaired = computed(() => this.pairedIdentity() !== null);
  readonly hasActiveOperator = computed(() => this.operatorSession() !== null);

  initialize(): Promise<void> {
    this.initialization ??= this.hydrate();
    return this.initialization;
  }

  async setPairedIdentity(identity: PairedDeviceIdentity): Promise<void> {
    assertFutureExpiry(identity.expiresAt);
    await this.storage.clear();
    this.pairedIdentityState.set(null);
    this.operatorSessionState.set(null);
    this.pendingPairingState.set(null);
    await this.storage.save('pairedIdentity', identity);
    this.pairedIdentityState.set(identity);
  }

  async setOperatorSession(session: PosEmployeeSession): Promise<void> {
    if (this.mode() !== 'REGISTER') throw new Error('DEVICE_SESSION_REGISTER_REQUIRED');
    assertFutureExpiry(session.expiresAt);
    await this.storage.save('operatorSession', session);
    this.operatorSessionState.set(session);
  }

  async setPendingPairing(pairing: PendingDevicePairing): Promise<void> {
    assertFutureExpiry(pairing.expiresAt);
    await this.storage.save('pendingPairing', pairing);
    this.pendingPairingState.set(pairing);
  }

  async clearOperatorSession(): Promise<void> {
    this.operatorSessionState.set(null);
    await this.storage.remove('operatorSession');
  }

  async clearPendingPairing(): Promise<void> {
    this.pendingPairingState.set(null);
    await this.storage.remove('pendingPairing');
  }

  async clear(): Promise<void> {
    this.pairedIdentityState.set(null);
    this.operatorSessionState.set(null);
    this.pendingPairingState.set(null);
    await this.storage.clear();
  }

  private async hydrate(): Promise<void> {
    try {
      await this.storage.initialize();
      const session = await this.storage.load();
      const hasRegister = session.pairedIdentity?.device.type === 'REGISTER';
      const cleanup: Promise<void>[] = [];
      if (session.operatorSession && !hasRegister) cleanup.push(this.storage.remove('operatorSession'));
      if (session.pairedIdentity && session.pendingPairing) cleanup.push(this.storage.remove('pendingPairing'));
      await Promise.all(cleanup);

      this.pairedIdentityState.set(session.pairedIdentity);
      this.operatorSessionState.set(hasRegister ? session.operatorSession : null);
      this.pendingPairingState.set(session.pairedIdentity ? null : session.pendingPairing);
      this.storageErrorCodeState.set(null);
    } catch (error: unknown) {
      this.pairedIdentityState.set(null);
      this.operatorSessionState.set(null);
      this.pendingPairingState.set(null);
      this.storageErrorCodeState.set(
        error instanceof DeviceSessionStorageError ? error.code : 'DEVICE_SESSION_STORAGE_FAILED'
      );
    } finally {
      this.initializedState.set(true);
    }
  }
}

function assertFutureExpiry(expiresAt: string): void {
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error('DEVICE_SESSION_EXPIRED');
}
