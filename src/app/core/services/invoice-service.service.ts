// factura.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collection, deleteDoc, doc, getDocs, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth-service.service';
import { from, Observable, of, switchMap } from 'rxjs';
import { Invoice } from '../interfaces/Invoice.interfaces';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  constructor(private firestore: Firestore, private authService: AuthService) {}

  async saveInvoice(resultado: any) {
    const user = this.authService.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const negocioId = await this.authService.getNegocioId(user.uid);
    const facturaId = resultado.factura.numero.replace(/[^\w\-]/g, '');
    resultado.factura.numero = facturaId;
    console.log(facturaId);

    const facturaRef = doc(this.firestore, `negocios/${negocioId}/facturas/${facturaId}`);
    const data = {
      proveedor: resultado.proveedor,
      factura: resultado.factura,
      productos: resultado.productos,
      subidoPor: user.uid,
      fechaSubida: new Date(),
      imagen: resultado.imagen,
      mimeType: resultado.mimeType
    };

    await setDoc(facturaRef, data);
    return facturaId;
  }

  getFacturas(): Observable<Invoice[]> {
    const uid = this.authService.currentUser?.uid;

    if (!uid) return of([]);

    return from(this.authService.getNegocioId(uid)).pipe(
      switchMap((negocioId) => {
        if (!negocioId) return of([]);
        const facturasRef = collection(this.firestore, `negocios/${negocioId}/facturas`);
        return from(getDocs(facturasRef)).pipe(
          switchMap((snap) => {
            const facturas: Invoice[] = snap.docs.map((doc) => ({
              ...(doc.data() as Invoice),
              id: doc.id
            }));
            return of(facturas);
          })
        );
      })
    );
  }

  async eliminarFactura(id: string): Promise<void> {
    const uid = this.authService.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado');
  
    const negocioId = await this.authService.getNegocioId(uid);
    if (!negocioId) throw new Error('Negocio no encontrado');
  
    const facturaRef = doc(this.firestore, `negocios/${negocioId}/facturas/${id}`);
    await deleteDoc(facturaRef);
  }

}