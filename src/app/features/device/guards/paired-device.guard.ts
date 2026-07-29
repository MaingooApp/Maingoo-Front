import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { DeviceSessionService } from '../services/device-session.service';

export const pairedDeviceGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = inject(DeviceSessionService);

  await session.initialize();
  return session.isPaired() || router.createUrlTree(['/dispositivo']);
};
