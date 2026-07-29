import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { PosEmployeeSession } from '../../models/device-session.models';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';
import { TerminalPinComponent } from './terminal-pin.component';

describe('TerminalPinComponent', () => {
  let pairing: jasmine.SpyObj<DevicePairingService>;
  let session: jasmine.SpyObj<DeviceSessionService>;
  let component: TerminalPinComponent;

  beforeEach(() => {
    pairing = jasmine.createSpyObj<DevicePairingService>('DevicePairingService', ['createEmployeeSession']);
    session = jasmine.createSpyObj<DeviceSessionService>('DeviceSessionService', ['setOperatorSession']);
    session.setOperatorSession.and.resolveTo();
    TestBed.configureTestingModule({
      imports: [TerminalPinComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DevicePairingService, useValue: pairing },
        { provide: DeviceSessionService, useValue: session }
      ]
    });
    component = TestBed.runInInjectionContext(() => new TerminalPinComponent());
  });

  it('exposes a labeled keyboard flow without revealing the PIN', () => {
    const fixture = TestBed.createComponent(TerminalPinComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#terminal-pin');
    const keypad: HTMLElement = fixture.nativeElement.querySelector('[role="group"]');

    expect(input.type).toBe('password');
    expect(input.autofocus).toBeTrue();
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(keypad.getAttribute('aria-label')).toBeTruthy();
    expect(keypad.querySelectorAll('button[aria-label]').length).toBe(12);
  });

  it('clears the PIN and stores the employee session after access succeeds', async () => {
    pairing.createEmployeeSession.and.returnValue(of(employeeSession()));
    component.setPin('1234');

    await component.submit();

    expect(pairing.createEmployeeSession).toHaveBeenCalledOnceWith('1234');
    expect(session.setOperatorSession).toHaveBeenCalledOnceWith(employeeSession());
    expect(component.pin()).toBe('');
  });

  it('shows one generic error and clears the PIN after a rejected access', async () => {
    pairing.createEmployeeSession.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, error: { code: 'EMPLOYEE_PIN_INVALID' } }))
    );
    component.setPin('9999');

    await component.submit();

    expect(component.errorCode()).toBe('EMPLOYEE_PIN_INVALID');
    expect(component.pin()).toBe('');
  });

  it('uses the backend retry duration for the lock countdown', async () => {
    jasmine.clock().install();
    pairing.createEmployeeSession.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 423,
            error: { code: 'EMPLOYEE_PIN_LOCKED', retryAfterSeconds: 2 }
          })
      )
    );
    component.setPin('9999');

    await component.submit();
    expect(component.lockRemainingSeconds()).toBe(2);

    jasmine.clock().tick(2000);
    expect(component.lockRemainingSeconds()).toBe(0);
    jasmine.clock().uninstall();
  });
});

function employeeSession(): PosEmployeeSession {
  return {
    user: { id: 'user-1', name: 'Camarero' },
    permissions: ['pos.sell'],
    operatorToken: 'operator-token',
    expiresAt: '2099-01-01T00:00:00.000Z'
  };
}
