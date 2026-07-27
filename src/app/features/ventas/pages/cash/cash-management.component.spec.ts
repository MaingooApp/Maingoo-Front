import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '@features/auth/services/auth-service.service';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';

import { CashSessionWithMovements, PosDevice } from '../../models/pos.models';
import { PosOfflineQueueService, PosOfflineStorageError } from '../../services/pos-offline-queue.service';
import { PosService } from '../../services/pos.service';
import { CashManagementComponent } from './cash-management.component';

describe('CashManagementComponent', () => {
  let fixture: ComponentFixture<CashManagementComponent>;
  let component: CashManagementComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let offlineQueue: jasmine.SpyObj<PosOfflineQueueService>;
  let posService: jasmine.SpyObj<PosService>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getEnterpriseId']);
    offlineQueue = jasmine.createSpyObj<PosOfflineQueueService>('PosOfflineQueueService', [
      'useEnterprise',
      'currentEnterpriseId',
      'getDevice',
      'saveDevice'
    ]);
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'listDevices',
      'getCurrentCashSession',
      'openCashSession',
      'createCashMovement',
      'closeCashSession'
    ]);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    authService.getEnterpriseId.and.returnValue(register.enterpriseId);
    offlineQueue.useEnterprise.and.resolveTo();
    offlineQueue.currentEnterpriseId.and.returnValue(register.enterpriseId);
    offlineQueue.getDevice.and.resolveTo({
      enterpriseId: register.enterpriseId,
      deviceId: register.id,
      code: register.code,
      lastValidatedAt: register.updatedAt
    });
    offlineQueue.saveDevice.and.resolveTo();
    posService.listDevices.and.returnValue(of([register]));
    posService.getCurrentCashSession.and.returnValue(of(openSession));
    confirmDialog.confirm.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [CashManagementComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: PosOfflineQueueService, useValue: offlineQueue },
        { provide: PosService, useValue: posService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        provideNoopAnimations()
      ]
    });

    fixture = TestBed.createComponent(CashManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('reuses the terminal register and rejects invalid or offline cash operations', async () => {
    expect(offlineQueue.useEnterprise).toHaveBeenCalledOnceWith(register.enterpriseId);
    expect(offlineQueue.getDevice).toHaveBeenCalledTimes(1);
    expect(component.selectedDevice()).toEqual(register);
    expect(posService.getCurrentCashSession).toHaveBeenCalledOnceWith(register.id);

    component.movementAmount = '10.00';
    component.movementReason = 'no';
    await component.createMovement();
    expect(posService.createCashMovement).not.toHaveBeenCalled();

    component.startClosing();
    component.countedCash = '95.00';
    component.online.set(false);
    await component.closeSession();

    expect(confirmDialog.confirm).not.toHaveBeenCalled();
    expect(posService.closeCashSession).not.toHaveBeenCalled();
  });

  it('retries an ambiguous opening with the same idempotency key', async () => {
    posService.getCurrentCashSession.and.returnValue(of(null));
    component.selectDevice(register.id);
    await fixture.whenStable();
    posService.openCashSession.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of(openSession)
    );
    component.openingAmount = '50.00';

    await component.openSession();
    const firstKey = posService.openCashSession.calls.argsFor(0)[1];
    expect(component.lastIntent()).not.toBeNull();

    component.retryLastAction();

    expect(posService.openCashSession.calls.count()).toBe(2);
    expect(posService.openCashSession.calls.argsFor(1)[1]).toBe(firstKey);
    expect(component.session()).toEqual(openSession);
    expect(component.lastIntent()).toBeNull();
  });

  it('blocks a double close and keeps the authoritative closed summary', async () => {
    const response = new Subject<CashSessionWithMovements>();
    posService.closeCashSession.and.returnValue(response);
    component.startClosing();
    component.countedCash = '98.00';

    await component.closeSession();
    await component.closeSession();

    expect(posService.closeCashSession).toHaveBeenCalledTimes(1);
    response.next(closedSession);
    response.complete();

    expect(component.session()).toEqual(closedSession);
    expect(component.session()?.difference).toBe('-2.00');
    expect(component.closing()).toBeFalse();
  });

  it('persists a manual register selection in the active enterprise namespace', async () => {
    component.selectDevice('');
    component.selectDevice(register.id);
    await fixture.whenStable();

    expect(offlineQueue.saveDevice).toHaveBeenCalledOnceWith(register);
    expect(component.selectedDeviceId()).toBe(register.id);
  });

  it('rejects a cached device from another enterprise without loading its session', async () => {
    posService.getCurrentCashSession.calls.reset();
    offlineQueue.getDevice.and.resolveTo({
      enterpriseId: 'other-enterprise',
      deviceId: register.id,
      code: register.code,
      lastValidatedAt: register.updatedAt
    });

    component.loadDevices();
    await settleAsyncDeviceLoad();

    expect(component.selectedDeviceId()).toBe('');
    expect(component.deviceLoadFailed()).toBeTrue();
    expect(component.errorCode()).toBe('POS_OFFLINE_NAMESPACE_MISMATCH');
    expect(posService.getCurrentCashSession).not.toHaveBeenCalled();
  });

  it('exposes a stable storage error and clears the previous tenant selection', async () => {
    offlineQueue.getDevice.and.rejectWith(new PosOfflineStorageError('POS_OFFLINE_STORAGE_FAILED'));

    component.loadDevices();
    await settleAsyncDeviceLoad();

    expect(component.selectedDeviceId()).toBe('');
    expect(component.deviceLoadFailed()).toBeTrue();
    expect(component.errorCode()).toBe('POS_OFFLINE_STORAGE_FAILED');
  });

  it('discards a late session response after the authenticated enterprise changes', async () => {
    const response = new Subject<CashSessionWithMovements | null>();
    posService.getCurrentCashSession.and.returnValue(response);
    component.selectDevice(register.id);
    await fixture.whenStable();

    authService.getEnterpriseId.and.returnValue('other-enterprise');
    response.next(openSession);

    expect(component.selectedDevice()).toBeNull();
    expect(component.session()).toBeNull();
    component.openingAmount = '10.00';
    await component.openSession();
    expect(posService.openCashSession).not.toHaveBeenCalled();
  });

  async function settleAsyncDeviceLoad(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve));
  }
});

const register: PosDevice = {
  id: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
  enterpriseId: '58b2b7dc-bbee-4f1a-b99a-f18df405fcad',
  name: 'Caja principal',
  code: 'REGISTER-1',
  type: 'REGISTER',
  status: 'ACTIVE',
  lastSeenAt: null,
  appVersion: null,
  createdByUserId: 'user-1',
  createdAt: '2026-07-27T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z'
};

const openSession: CashSessionWithMovements = {
  id: 'd087d55e-f7a7-4528-adb8-14734c0f10ab',
  enterpriseId: register.enterpriseId,
  deviceId: register.id,
  status: 'OPEN',
  openingAmount: '50.00',
  expectedCash: '100.00',
  countedCash: null,
  difference: null,
  idempotencyKey: '0ab8fc69-4024-42a2-927e-cfb1c4d43dbe',
  openedByUserId: 'user-1',
  closedByUserId: null,
  openedAt: '2026-07-27T08:00:00.000Z',
  closedAt: null,
  createdAt: '2026-07-27T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
  cashMovements: []
};

const closedSession: CashSessionWithMovements = {
  ...openSession,
  status: 'CLOSED',
  countedCash: '98.00',
  difference: '-2.00',
  closedByUserId: 'user-1',
  closedAt: '2026-07-27T18:00:00.000Z',
  updatedAt: '2026-07-27T18:00:00.000Z'
};
