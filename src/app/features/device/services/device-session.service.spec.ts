import { TestBed } from '@angular/core/testing';

import { PairedDeviceIdentity, PosEmployeeSession } from '../models/device-session.models';
import { DeviceSessionStorageService } from './device-session-storage.service';
import { DeviceSessionService } from './device-session.service';

describe('DeviceSessionService', () => {
  let service: DeviceSessionService;
  let storage: jasmine.SpyObj<DeviceSessionStorageService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<DeviceSessionStorageService>('DeviceSessionStorageService', [
      'initialize',
      'load',
      'save',
      'remove',
      'clear'
    ]);
    storage.initialize.and.resolveTo();
    storage.save.and.resolveTo();
    storage.remove.and.resolveTo();
    storage.clear.and.resolveTo();
    storage.load.and.resolveTo({ pairedIdentity: null, operatorSession: null, pendingPairing: null });

    TestBed.configureTestingModule({
      providers: [DeviceSessionService, { provide: DeviceSessionStorageService, useValue: storage }]
    });
    service = TestBed.inject(DeviceSessionService);
  });

  it('hydrates once and exposes device identity only through readonly signals', async () => {
    storage.load.and.resolveTo({
      pairedIdentity: registerIdentity(),
      operatorSession: employeeSession(),
      pendingPairing: null
    });

    await Promise.all([service.initialize(), service.initialize()]);

    expect(storage.initialize).toHaveBeenCalledTimes(1);
    expect(service.deviceToken()).toBe('device-token');
    expect(service.operatorToken()).toBe('operator-token');
    expect(service.mode()).toBe('REGISTER');
  });

  it('removes an operator session restored for a non-register device', async () => {
    storage.load.and.resolveTo({
      pairedIdentity: { ...registerIdentity(), device: { ...registerIdentity().device, type: 'KDS' } },
      operatorSession: employeeSession(),
      pendingPairing: null
    });

    await service.initialize();

    expect(storage.remove).toHaveBeenCalledOnceWith('operatorSession');
    expect(service.operatorSession()).toBeNull();
  });

  it('rejects employee sessions unless the paired device is a register', async () => {
    await service.initialize();

    await expectAsync(service.setOperatorSession(employeeSession())).toBeRejectedWithError(
      'DEVICE_SESSION_REGISTER_REQUIRED'
    );
    expect(storage.save).not.toHaveBeenCalled();
  });
});

function registerIdentity(): PairedDeviceIdentity {
  return {
    device: {
      id: 'device-1',
      enterpriseId: 'enterprise-1',
      name: 'Terminal barra',
      type: 'REGISTER',
      kitchenStationId: null,
      status: 'ACTIVE'
    },
    deviceToken: 'device-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  };
}

function employeeSession(): PosEmployeeSession {
  return {
    user: { id: 'user-1', name: 'Camarero' },
    permissions: ['pos.orders.write'],
    operatorToken: 'operator-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  };
}
