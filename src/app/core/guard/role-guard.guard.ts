// role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service.service';
import { map, take } from 'rxjs/operators';

export const roleGuard = (requiredRole: string[]): CanActivateFn => {
    return () => {
        const authService = inject(AuthService);
        const router = inject(Router);

        // Verificar si el usuario está autenticado
        if (!authService.isAuthenticated()) {
            router.navigate(['/auth/login']);
            return false;
        }

        // Obtener el usuario actual
        const currentUser = authService.currentUser;

        if (!currentUser) {
            router.navigate(['/auth/login']);
            return false;
        }

        // Verificar si el rol del usuario está en los roles requeridos
        const userRole = currentUser.roleName;

        if (requiredRole.includes(userRole)) {
            return true;
        } else {
            router.navigate(['/unauthorized']);
            return false;
        }
    };
};
