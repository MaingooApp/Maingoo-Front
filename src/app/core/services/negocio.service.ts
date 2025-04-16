import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class NegocioService {
  constructor(private firestore: Firestore) {}

  async getPerfilNegocio(negocioId: string): Promise<any | null> {
    const docRef = doc(this.firestore, `negocios/${negocioId}/perfil/datos`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  async guardarPerfilNegocio(negocioId: string, datos: any): Promise<void> {
    const perfilRef = doc(this.firestore, `negocios/${negocioId}/perfil/datos`);
    await setDoc(perfilRef, datos, { merge: true });
  }
}
