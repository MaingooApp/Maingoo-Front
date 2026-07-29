import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { PosSessionStore } from '../../../ventas/services/pos-session.store';
import { PosEmployeeSession } from '../../models/device-session.models';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';
import { DeviceTerminalComponent } from './device-terminal.component';

describe('DeviceTerminalComponent employee expiry', () => {
  let fixture: ComponentFixture<DeviceTerminalComponent>;
  let component: DeviceTerminalComponent;
  let operatorSession: ReturnType<typeof signal<PosEmployeeSession | null>>;
  let session: jasmine.SpyObj<DeviceSessionService>;
  let pairing: jasmine.SpyObj<DevicePairingService>;
  let store: jasmine.SpyObj<PosSessionStore>;
  let mutationBlockCode: ReturnType<typeof signal<string | null>>;

  beforeEach(async () => {
    operatorSession = signal<PosEmployeeSession | null>(activeOperator());
    mutationBlockCode = signal<string | null>(null);
    session = jasmine.createSpyObj<DeviceSessionService>(
      'DeviceSessionService',
      ['initialize', 'clearOperatorSession'],
      {
        operatorSession,
        mode: signal<'REGISTER' | null>('REGISTER'),
        hasActiveOperator: signal(true)
      }
    );
    session.initialize.and.resolveTo();
    session.clearOperatorSession.and.callFake(async () => operatorSession.set(null));
    pairing = jasmine.createSpyObj<DevicePairingService>('DevicePairingService', ['getContext']);
    store = jasmine.createSpyObj<PosSessionStore>('PosSessionStore', ['bindEmployee', 'setMutationBlock'], {
      mutationBlockCode
    });
    store.setMutationBlock.and.callFake((code) => mutationBlockCode.set(code));

    await TestBed.configureTestingModule({
      imports: [DeviceTerminalComponent],
      providers: [
        { provide: DeviceSessionService, useValue: session },
        { provide: DevicePairingService, useValue: pairing },
        { provide: PosSessionStore, useValue: store },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) }
      ]
    })
      .overrideComponent(DeviceTerminalComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DeviceTerminalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('keeps the terminal visible but blocks mutations when the operator expires offline', async () => {
    operatorSession.set(expiredOperator());
    component.online.set(false);

    await component.reconcileOperatorSession();

    expect(store.bindEmployee).toHaveBeenCalledWith('user-1');
    expect(store.setMutationBlock).toHaveBeenCalledWith('EMPLOYEE_SESSION_EXPIRED_OFFLINE');
    expect(component.sessionNoticeCode()).toBe('EMPLOYEE_SESSION_EXPIRED_OFFLINE');
    expect(session.clearOperatorSession).not.toHaveBeenCalled();
  });

  it('clears only the operator session online so the terminal asks for the PIN again', async () => {
    operatorSession.set(expiredOperator());
    component.online.set(true);

    await component.reconcileOperatorSession();

    expect(store.setMutationBlock).toHaveBeenCalledWith('EMPLOYEE_SESSION_EXPIRED');
    expect(session.clearOperatorSession).toHaveBeenCalledTimes(1);
  });

  it('uses cached device state offline instead of failing context validation', async () => {
    component.online.set(false);

    await component.validate();

    expect(pairing.getContext).not.toHaveBeenCalled();
    expect(component.contextError()).toBeFalse();
    expect(component.validating()).toBeFalse();
  });
});

function activeOperator(): PosEmployeeSession {
  return {
    user: { id: 'user-1', name: 'Camarero' },
    permissions: ['pos.orders.write'],
    operatorToken: 'operator-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  };
}

function expiredOperator(): PosEmployeeSession {
  return { ...activeOperator(), expiresAt: '2000-01-01T00:00:00.000Z' };
}
