import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { BaseHttpService } from './base-http.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NegocioService extends BaseHttpService{
  constructor(private firestore: Firestore,http: HttpClient) {
    super(http);
  }

  async getPerfilNegocio(negocioId: string): Promise<any | null> {
    const docRef = doc(this.firestore, `negocios/${negocioId}/perfil/datos`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  async guardarPerfilNegocio(negocioId: string, datos: any): Promise<void> {
    const perfilRef = doc(this.firestore, `negocios/${negocioId}/perfil/datos`);
    await setDoc(perfilRef, datos, { merge: true });
  }

  descargarHtmlEmpresa(datos: any): Promise<string> {
    return firstValueFrom(
      this.post<{ html: string }>(environment.urlBackend + 'api/empresa-pdf', datos).pipe()
    ).then(response => response.html);
  }
}
