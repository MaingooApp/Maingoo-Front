import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppPermission } from '@core/constants/permissions.enum';
import { AuthService } from '@features/auth/services/auth-service.service';

const FALLBACK_ROUTES: Array<{ permissions: AppPermission[]; route: string }> = [
  {
    permissions: [AppPermission.PosRead, AppPermission.PosSell, AppPermission.PosCash],
    route: '/ventas/caja'
  },
  { permissions: [AppPermission.PosRead], route: '/ventas' },
  { permissions: [AppPermission.InventoryRead], route: '/inventario' },
  { permissions: [AppPermission.InvoicesRead], route: '/facturas' },
  { permissions: [AppPermission.SuppliersRead], route: '/proveedores' },
  { permissions: [AppPermission.ProductsRead], route: '/productos' },
  { permissions: [AppPermission.BillingRead], route: '/suscripcion' },
  { permissions: [AppPermission.IotRead], route: '/appcc' },
  {
    permissions: [AppPermission.UsersRead, AppPermission.PermissionsAssign],
    route: '/usuarios'
  },
  { permissions: [AppPermission.AuditRead], route: '/auditoria' }
];

export function requireAllPermissions(...requiredPermissions: AppPermission[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const isAdmin = authService.hasPermission(AppPermission.AdminSuper);

    if (isAdmin || requiredPermissions.every((permission) => authService.hasPermission(permission))) {
      return true;
    }

    const fallback = FALLBACK_ROUTES.find(({ permissions }) =>
      permissions.every((permission) => authService.hasPermission(permission))
    );

    return router.createUrlTree([fallback?.route ?? '/miperfil']);
  };
}
