import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { DeviceSessionService } from '../services/device-session.service';
import { deviceModeGuard } from './device-mode.guard';
import { pairedDeviceGuard } from './paired-device.guard';

describe('device guards', () => {
  let router: jasmine.SpyObj<Router>;
  let session: {
    initialize: jasmine.Spy<() => Promise<void>>;
    isPaired: ReturnType<typeof signal<boolean>>;
    mode: ReturnType<typeof signal<'KDS' | 'REGISTER' | null>>;
  };
  const redirect = {} as UrlTree;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(redirect);
    session = {
      initialize: jasmine.createSpy('initialize').and.resolveTo(),
      isPaired: signal(false),
      mode: signal(null)
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: DeviceSessionService, useValue: session }
      ]
    });
  });

  it('redirects an unpaired device without invoking human authentication', async () => {
    const result = await TestBed.runInInjectionContext(() => pairedDeviceGuard({} as never, {} as never));

    expect(session.initialize).toHaveBeenCalledTimes(1);
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/dispositivo']);
    expect(result).toBe(redirect);
  });

  it('redirects a paired device to the route matching its own mode', () => {
    session.mode.set('REGISTER');
    const route = { data: { deviceMode: 'KDS' } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => deviceModeGuard(route, {} as never));

    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/dispositivo/terminal']);
    expect(result).toBe(redirect);
  });
});
