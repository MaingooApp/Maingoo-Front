import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';

import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';

import { CashSessionWithMovements, PosDevice } from '../../models/pos.models';
import { PosService } from '../../services/pos.service';
import { CashManagementComponent } from './cash-management.component';

const DEVICE_STORAGE_KEY = 'maingoo-pos-device-id';

describe('CashManagementComponent', () => {
  let fixture: ComponentFixture<CashManagementComponent>;
  let component: CashManagementComponent;
  let posService: jasmine.SpyObj<PosService>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(() => {
    localStorage.setItem(DEVICE_STORAGE_KEY, register.id);
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'listDevices',
      'getCurrentCashSession',
      'openCashSession',
      'createCashMovement',
      'closeCashSession'
    ]);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    posService.listDevices.and.returnValue(of([register]));
    posService.getCurrentCashSession.and.returnValue(of(openSession));
    confirmDialog.confirm.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [CashManagementComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        provideNoopAnimations()
      ]
    });

    fixture = TestBed.createComponent(CashManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem(DEVICE_STORAGE_KEY));

  it('reuses the terminal register and rejects invalid or offline cash operations', async () => {
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
