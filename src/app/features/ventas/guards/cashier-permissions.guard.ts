import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppPermission } from '@core/constants/permissions.enum';
import { AuthService } from '@features/auth/services/auth-service.service';

const REQUIRED_PERMISSIONS = [AppPermission.PosRead, AppPermission.PosSell, AppPermission.PosCash];

export const cashierPermissionsGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return REQUIRED_PERMISSIONS.every((permission) => authService.hasPermission(permission))
    ? true
    : router.createUrlTree(['/ventas']);
};
