// role.guard.ts
import { inject } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collectionGroup, getDocs } from '@angular/fire/firestore';
import { CanActivateFn, Router } from '@angular/router';

export const roleGuard = (requiredRole: string[]): CanActivateFn => {
  return () => {
    const auth = inject(Auth);
    const firestore = inject(Firestore);
    const router = inject(Router);

    return new Promise<boolean>((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        
        if (!user) {
          router.navigate(['/auth/login']);
          return resolve(false);
        }

        try {
          const usuariosSnap = await getDocs(collectionGroup(firestore, 'usuarios'));
          const match = usuariosSnap.docs.find(doc => doc.id === user.uid);

          const userRole = match?.data()?.['rol'];

          if (requiredRole.includes(userRole)) {
            
            return resolve(true);
          } else {
            router.navigate(['/unauthorized']);
            return resolve(false);
          }
        } catch (error) {
          console.error('❌ Error en roleGuard:', error);
          router.navigate(['/auth/login']);
          resolve(false);
        }
      });
    });
  };
};