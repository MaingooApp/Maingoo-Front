import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { DeviceMode } from '../models/device-session.models';
import { DeviceSessionService } from '../services/device-session.service';

export const deviceModeGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const session = inject(DeviceSessionService);
  const requiredMode = route.data['deviceMode'] as DeviceMode | undefined;

  if (requiredMode && session.mode() === requiredMode) return true;

  return session.mode() === 'KDS'
    ? router.createUrlTree(['/dispositivo/cocina'])
    : session.mode() === 'REGISTER'
      ? router.createUrlTree(['/dispositivo/terminal'])
      : router.createUrlTree(['/dispositivo']);
};
