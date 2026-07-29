import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { DeviceSessionService } from '../../services/device-session.service';
import { DeviceRevokedComponent } from './device-revoked.component';

describe('DeviceRevokedComponent', () => {
  it('clears any residual session before starting a new pairing', async () => {
    const session = jasmine.createSpyObj<DeviceSessionService>('DeviceSessionService', ['clear']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    session.clear.and.resolveTo();
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: DeviceSessionService, useValue: session },
        { provide: Router, useValue: router }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new DeviceRevokedComponent());

    await component.rePair();

    expect(session.clear).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/dispositivo']);
  });
});
