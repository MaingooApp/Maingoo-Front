import { Injectable } from '@angular/core';
import { Auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Firestore, setDoc, doc, getDoc, getDocs, collectionGroup } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public authState$ = this.userSubject.asObservable();

  constructor(private auth: Auth, private firestore: Firestore) {
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
    });
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }

  async register(email: string, password: string, esAdmin = false, negocioId?: string) {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = cred.user.uid;

    let assignedNegocioId = negocioId;

    if (esAdmin || !negocioId) {
      assignedNegocioId = uid;
    }

    // Guardar el usuario en /negocios/{negocioId}/usuarios/{uid}
    await setDoc(doc(this.firestore, `negocios/${assignedNegocioId}/usuarios/${uid}`), {
      email,
      rol: esAdmin ? 'ADMIN' : 'EMPLEADO',
      createdAt: new Date(),
    });

    return { cred, negocioId: assignedNegocioId };
  }

  async getUserRole(uid: string): Promise<string | null> {
    const userRef = doc(this.firestore, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data()?.['rol'] ?? null : null;
  }

  async getNegocioId(): Promise<string | null> {
    const uid = this.currentUser?.uid;
    if (!uid) return null;
  
    const usuariosSnap = await getDocs(collectionGroup(this.firestore, 'usuarios'));
    const match = usuariosSnap.docs.find(doc => doc.id === uid);
    const pathSegments = match?.ref.path.split('/');
    const negocioId = pathSegments?.[1]; 
    return negocioId ?? null;
  }

}