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
        console.log(`🔑 Verificando acceso para el usuario: ${user?.uid}`);
        
        if (!user) {
          router.navigate(['/auth/login']);
          return resolve(false);
        }

        try {
          const usuariosSnap = await getDocs(collectionGroup(firestore, 'usuarios'));
          const match = usuariosSnap.docs.find(doc => doc.id === user.uid);

          const userRole = match?.data()?.['rol'];

          if (requiredRole.includes(userRole)) {
            console.log(`✅ Acceso concedido: ${userRole}`);
            
            return resolve(true);
          } else {
            console.log(`❌ Acceso denegado: ${userRole}`);
            
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