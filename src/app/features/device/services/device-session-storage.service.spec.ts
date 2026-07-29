import { TestBed } from '@angular/core/testing';

import {
  DeviceSessionKey,
  DeviceSessionValues,
  PairedDeviceIdentity,
  PosEmployeeSession
} from '../models/device-session.models';
import {
  DEVICE_SESSION_DATABASE,
  DeviceSessionDatabase,
  DeviceSessionStorageError,
  DeviceSessionStorageService
} from './device-session-storage.service';

describe('DeviceSessionStorageService', () => {
  let database: FakeDeviceSessionDatabase;
  let service: DeviceSessionStorageService;

  beforeEach(() => {
    database = new FakeDeviceSessionDatabase();
    TestBed.configureTestingModule({
      providers: [DeviceSessionStorageService, { provide: DEVICE_SESSION_DATABASE, useValue: database }]
    });
    service = TestBed.inject(DeviceSessionStorageService);
  });

  it('stores device and operator identities independently and never needs a PIN', async () => {
    await service.save('pairedIdentity', pairedIdentity());
    await service.save('operatorSession', operatorSession());

    expect(await service.load()).toEqual({
      pairedIdentity: pairedIdentity(),
      operatorSession: operatorSession(),
      pendingPairing: null
    });
    expect(JSON.stringify([...database.records.values()])).not.toContain('1234');

    await service.remove('operatorSession');
    expect(await service.get('pairedIdentity')).toEqual(pairedIdentity());
    expect(await service.get('operatorSession')).toBeNull();
  });

  it('removes expired and malformed records fail-closed', async () => {
    await service.save('operatorSession', { ...operatorSession(), expiresAt: '2000-01-01T00:00:00.000Z' });
    await service.save('pendingPairing', {
      pairingId: 'pairing-1',
      deviceCode: 'device-code',
      userCode: 'ABCD-EFGH',
      expiresAt: 'not-a-date',
      verificationUri: 'https://app.maingoo.tech/dispositivo',
      verificationUriComplete: 'https://app.maingoo.tech/dispositivo?userCode=ABCD-EFGH',
      pollIntervalSeconds: 5
    });

    expect(await service.get('operatorSession')).toBeNull();
    expect(await service.get('pendingPairing')).toBeNull();
    expect(database.records.size).toBe(0);
  });

  it('clears every device record after revocation', async () => {
    await service.save('pairedIdentity', pairedIdentity());
    await service.save('operatorSession', operatorSession());
    await service.save('pendingPairing', {
      pairingId: 'pairing-1',
      deviceCode: 'device-code',
      userCode: 'ABCD-EFGH',
      expiresAt: '2099-01-01T00:00:00.000Z',
      verificationUri: 'https://app.maingoo.tech/dispositivo',
      verificationUriComplete: 'https://app.maingoo.tech/dispositivo?userCode=ABCD-EFGH',
      pollIntervalSeconds: 5
    });

    await service.clear();

    expect(await service.load()).toEqual({ pairedIdentity: null, operatorSession: null, pendingPairing: null });
  });

  it('maps IndexedDB quota errors to a stable error code', async () => {
    database.failure = new DOMException('Quota exceeded', 'QuotaExceededError');

    await expectAsync(service.save('pairedIdentity', pairedIdentity())).toBeRejectedWithError(
      DeviceSessionStorageError,
      'DEVICE_SESSION_STORAGE_QUOTA_EXCEEDED'
    );
  });
});

class FakeDeviceSessionDatabase implements DeviceSessionDatabase {
  readonly records = new Map<DeviceSessionKey, DeviceSessionValues[DeviceSessionKey]>();
  failure: Error | null = null;

  async initialize(): Promise<void> {
    this.failIfRequested();
  }

  async get<TKey extends DeviceSessionKey>(key: TKey): Promise<DeviceSessionValues[TKey] | undefined> {
    this.failIfRequested();
    return this.records.get(key) as DeviceSessionValues[TKey] | undefined;
  }

  async put<TKey extends DeviceSessionKey>(key: TKey, value: DeviceSessionValues[TKey]): Promise<void> {
    this.failIfRequested();
    this.records.set(key, value);
  }

  async delete(key: DeviceSessionKey): Promise<void> {
    this.failIfRequested();
    this.records.delete(key);
  }

  async clear(): Promise<void> {
    this.failIfRequested();
    this.records.clear();
  }

  private failIfRequested(): void {
    if (this.failure) throw this.failure;
  }
}

function pairedIdentity(): PairedDeviceIdentity {
  return {
    device: {
      id: 'device-1',
      enterpriseId: 'enterprise-1',
      name: 'Terminal barra',
      type: 'REGISTER',
      kitchenStationId: null,
      status: 'ACTIVE'
    },
    deviceToken: 'permanent-device-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  };
}

function operatorSession(): PosEmployeeSession {
  return {
    user: { id: 'user-1', name: 'Camarero' },
    permissions: ['pos.orders.write'],
    operatorToken: 'temporary-operator-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  };
}
