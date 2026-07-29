import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import {
  DevicePairingChallenge,
  DevicePairingExchangeSuccess,
  PendingDevicePairing
} from '../../models/device-session.models';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';
import { DevicePairingComponent } from './device-pairing.component';

describe('DevicePairingComponent', () => {
  let pairing: jasmine.SpyObj<DevicePairingService>;
  let session: jasmine.SpyObj<DeviceSessionService>;
  let router: jasmine.SpyObj<Router>;
  let mode: jasmine.Spy;
  let pendingPairing: jasmine.Spy;

  beforeEach(() => {
    pairing = jasmine.createSpyObj<DevicePairingService>('DevicePairingService', ['create', 'exchange']);
    session = jasmine.createSpyObj<DeviceSessionService>('DeviceSessionService', [
      'initialize',
      'setPendingPairing',
      'clearPendingPairing',
      'setPairedIdentity'
    ]);
    mode = jasmine.createSpy('mode').and.returnValue(null);
    pendingPairing = jasmine.createSpy('pendingPairing').and.returnValue(null);
    Object.assign(session, { mode, pendingPairing });
    session.initialize.and.resolveTo();
    session.setPendingPairing.and.resolveTo();
    session.clearPendingPairing.and.resolveTo();
    session.setPairedIdentity.and.resolveTo();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [DevicePairingComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DevicePairingService, useValue: pairing },
        { provide: DeviceSessionService, useValue: session },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('stores a new challenge before showing its QR', async () => {
    const challenge = createChallenge();
    pairing.create.and.returnValue(of(challenge));
    const fixture = TestBed.createComponent(DevicePairingComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectMode('REGISTER');
    fixture.componentInstance.requestedLabel = ' Tablet barra ';
    await fixture.componentInstance.createPairing();

    expect(pairing.create).toHaveBeenCalledOnceWith({
      requestedType: 'REGISTER',
      requestedLabel: 'Tablet barra'
    });
    expect(session.setPendingPairing).toHaveBeenCalledOnceWith(challenge);
    expect(fixture.componentInstance.challenge()).toBe(challenge);
    fixture.destroy();
  });

  it('resumes polling and saves the credential before redirecting', fakeAsync(() => {
    const challenge = createChallenge();
    const identity = pairedIdentity();
    const steps: string[] = [];
    pendingPairing.and.returnValue(challenge);
    pairing.exchange.and.returnValue(of(identity));
    session.setPairedIdentity.and.callFake(async () => {
      steps.push('persist');
    });
    router.navigate.and.callFake(async () => {
      steps.push('navigate');
      return true;
    });
    const fixture = TestBed.createComponent(DevicePairingComponent);

    fixture.detectChanges();
    flushMicrotasks();
    tick(challenge.pollIntervalSeconds * 1_000);
    flushMicrotasks();

    expect(pairing.exchange).toHaveBeenCalledOnceWith(challenge.deviceCode);
    expect(session.setPairedIdentity).toHaveBeenCalledOnceWith(identity);
    expect(steps).toEqual(['persist', 'navigate']);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/dispositivo', 'cocina'], { replaceUrl: true });
    fixture.destroy();
  }));

  it('clears an expired pending challenge', fakeAsync(() => {
    pendingPairing.and.returnValue({
      ...createChallenge(),
      expiresAt: new Date(Date.now() + 1_000).toISOString()
    });
    const fixture = TestBed.createComponent(DevicePairingComponent);

    fixture.detectChanges();
    flushMicrotasks();
    tick(1_000);
    flushMicrotasks();

    expect(session.clearPendingPairing).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.challenge()).toBeNull();
    expect(fixture.componentInstance.errorCode()).toBe('PAIRING_EXPIRED');
    fixture.destroy();
  }));

  it('pauses polling while the document is hidden and resumes when visible', fakeAsync(() => {
    const hidden = spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    const challenge = createChallenge();
    pendingPairing.and.returnValue(challenge);
    pairing.exchange.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 429, error: { code: 'PAIRING_SLOW_DOWN' } }))
    );
    const fixture = TestBed.createComponent(DevicePairingComponent);

    fixture.detectChanges();
    flushMicrotasks();
    tick(challenge.pollIntervalSeconds * 2_000);
    expect(pairing.exchange).not.toHaveBeenCalled();

    hidden.and.returnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    tick(challenge.pollIntervalSeconds * 1_000);
    flushMicrotasks();
    expect(pairing.exchange).toHaveBeenCalledTimes(1);

    tick(9_999);
    expect(pairing.exchange).toHaveBeenCalledTimes(1);
    tick(1);
    flushMicrotasks();
    expect(pairing.exchange).toHaveBeenCalledTimes(2);
    fixture.destroy();
  }));
});

function createChallenge(): PendingDevicePairing {
  return {
    pairingId: 'pairing-1',
    deviceCode: 'opaque-device-code',
    userCode: 'ABCD-EFGH',
    verificationUri: 'https://app.maingoo.tech/ventas/configuracion/dispositivos/emparejar',
    verificationUriComplete: 'https://app.maingoo.tech/ventas/configuracion/dispositivos/emparejar?userCode=ABCD-EFGH',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    pollIntervalSeconds: 5
  } satisfies DevicePairingChallenge;
}

function pairedIdentity(): DevicePairingExchangeSuccess {
  return {
    device: {
      id: 'device-1',
      enterpriseId: 'enterprise-1',
      name: 'Cocina',
      type: 'KDS',
      kitchenStationId: null,
      status: 'ACTIVE'
    },
    deviceToken: 'device-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    mode: 'KDS'
  };
}
