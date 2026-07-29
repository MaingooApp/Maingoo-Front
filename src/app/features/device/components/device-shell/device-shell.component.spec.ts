import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { PosSessionStore } from '../../../ventas/services/pos-session.store';
import { PairedDeviceIdentity, PosEmployeeSession } from '../../models/device-session.models';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';
import { DeviceShellComponent } from './device-shell.component';

describe('DeviceShellComponent employee logout policy', () => {
  let pendingCount: WritableSignal<number>;
  let mutationBlockCode: WritableSignal<string | null>;
  let operator: WritableSignal<PosEmployeeSession | null>;
  let session: jasmine.SpyObj<DeviceSessionService>;
  let pairing: jasmine.SpyObj<DevicePairingService>;
  let store: jasmine.SpyObj<PosSessionStore>;

  beforeEach(() => {
    pendingCount = signal(0);
    mutationBlockCode = signal<string | null>(null);
    operator = signal<PosEmployeeSession | null>(employeeSession());
    session = jasmine.createSpyObj<DeviceSessionService>('DeviceSessionService', ['clearOperatorSession'], {
      device: signal<PairedDeviceIdentity['device'] | null>(registerDevice()).asReadonly(),
      operatorSession: operator.asReadonly()
    });
    session.clearOperatorSession.and.callFake(async () => operator.set(null));
    pairing = jasmine.createSpyObj<DevicePairingService>('DevicePairingService', ['logoutEmployeeSession']);
    pairing.logoutEmployeeSession.and.returnValue(of({ loggedOut: true }));
    store = jasmine.createSpyObj<PosSessionStore>('PosSessionStore', ['syncNow'], {
      pendingCommandCount: pendingCount.asReadonly(),
      mutationBlockCode: mutationBlockCode.asReadonly()
    });
    store.syncNow.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [DeviceShellComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DeviceSessionService, useValue: session },
        { provide: DevicePairingService, useValue: pairing },
        { provide: PosSessionStore, useValue: store },
        provideRouter([])
      ]
    });
  });

  it('shows the active employee and blocks logout while offline', async () => {
    const fixture = TestBed.createComponent(DeviceShellComponent);
    fixture.componentInstance.online.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="active-employee"]').textContent).toContain('Ana');

    await fixture.componentInstance.changeEmployee();

    expect(store.syncNow).not.toHaveBeenCalled();
    expect(pairing.logoutEmployeeSession).not.toHaveBeenCalled();
    expect(session.clearOperatorSession).not.toHaveBeenCalled();
    expect(fixture.componentInstance.employeeLogoutErrorCode()).toBe('EMPLOYEE_LOGOUT_OFFLINE');
  });

  it('syncs pending commands before remote and local logout', async () => {
    const order: string[] = [];
    pendingCount.set(2);
    store.syncNow.and.callFake(async () => {
      order.push('sync');
      pendingCount.set(0);
    });
    pairing.logoutEmployeeSession.and.callFake(() => {
      order.push('remote-logout');
      return of({ loggedOut: true });
    });
    session.clearOperatorSession.and.callFake(async () => {
      order.push('local-clear');
      operator.set(null);
    });
    const component = TestBed.createComponent(DeviceShellComponent).componentInstance;
    component.online.set(true);

    await component.changeEmployee();

    expect(order).toEqual(['sync', 'remote-logout', 'local-clear']);
    expect(component.employeeLogoutErrorCode()).toBeNull();
    expect(operator()).toBeNull();
  });

  it('keeps the employee session when synchronization leaves pending commands', async () => {
    pendingCount.set(1);
    const component = TestBed.createComponent(DeviceShellComponent).componentInstance;
    component.online.set(true);

    await component.changeEmployee();

    expect(store.syncNow).toHaveBeenCalledTimes(1);
    expect(pairing.logoutEmployeeSession).not.toHaveBeenCalled();
    expect(session.clearOperatorSession).not.toHaveBeenCalled();
    expect(component.employeeLogoutErrorCode()).toBe('EMPLOYEE_LOGOUT_SYNC_REQUIRED');
  });

  it('lets the wrong employee log out without replaying another employee commands', async () => {
    pendingCount.set(1);
    mutationBlockCode.set('POS_OFFLINE_EMPLOYEE_MISMATCH');
    const component = TestBed.createComponent(DeviceShellComponent).componentInstance;
    component.online.set(true);

    await component.changeEmployee();

    expect(store.syncNow).not.toHaveBeenCalled();
    expect(pairing.logoutEmployeeSession).toHaveBeenCalledTimes(1);
    expect(session.clearOperatorSession).toHaveBeenCalledTimes(1);
    expect(pendingCount()).toBe(1);
  });
});

function registerDevice(): PairedDeviceIdentity['device'] {
  return {
    id: 'device-1',
    enterpriseId: 'enterprise-1',
    name: 'Terminal barra',
    type: 'REGISTER',
    kitchenStationId: null,
    status: 'ACTIVE'
  };
}

function employeeSession(): PosEmployeeSession {
  return {
    user: { id: 'user-1', name: 'Ana' },
    permissions: ['pos.sell'],
    operatorToken: 'operator-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  };
}
