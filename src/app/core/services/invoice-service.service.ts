// factura.service.ts
import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth-service.service';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  constructor(private firestore: Firestore, private authService: AuthService) {}

  async saveInvoice(resultado: any) {
    const user = this.authService.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const negocioId = await this.authService.getNegocioId(user.uid);
    const facturaId = resultado.factura.numero;

    const facturaRef = doc(this.firestore, `negocios/${negocioId}/facturas/${facturaId}`);
    const data = {
      proveedor: resultado.proveedor,
      factura: resultado.factura,
      productos: resultado.productos,
      subidoPor: user.uid,
      fechaSubida: new Date()
    };

    await setDoc(facturaRef, data);
    return facturaId;
  }
}