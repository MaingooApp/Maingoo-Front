import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { from, switchMap, map } from 'rxjs';

export const roleGuard = (requiredRole: string): CanActivateFn => {
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

        const userRef = doc(firestore, 'users', user.uid);
        const snap = await getDoc(userRef);
        const role = snap.data()?.['rol'];

        if (role === requiredRole) {
          resolve(true);
        } else {
          router.navigate(['/unauthorized']);
          resolve(false);
        }
      });
    });
  };
};