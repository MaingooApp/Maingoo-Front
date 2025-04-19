// factura.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from '@angular/fire/firestore';
import { AuthService } from './auth-service.service';
import { from, map, Observable, of, switchMap } from 'rxjs';
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
          map((snap) => {
            const facturas: Invoice[] = snap.docs.map((doc) => {
              const data = doc.data() as Invoice;
  
              return {
                ...data,
                id: doc.id,
                factura: {
                  ...data.factura,
                  fecha_emision: this.convertToDate(data.factura?.fecha_emision) ?? '',
                  fecha_vencimiento: this.convertToDate(data.factura?.fecha_vencimiento) ?? '',
                  total_con_iva: this.convertToDecimal(data.factura?.total_con_iva) ?? 0,
                }
              };
            });
            return facturas;
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


  getProductosInventario(negocioId: string): Observable<any[]> {
    const ref = collection(this.firestore, `negocios/${negocioId}/productos_indexados`);
  
    return collectionData(ref, { idField: 'id' }).pipe(
      map((productos: any[]) => productos.map(producto => ({
        ...producto,
        precio: this.convertToDecimal(producto.precio),
        cantidad: this.convertToDecimal(producto.cantidad),
        fechaFactura: this.convertToDate(producto.fechaFactura)
      })))
    );
  }

  async indexarProductos(
    negocioId: string,
    productos: any[],
    proveedor: { nombre: string; nif: string },
    fechaFactura: string | Date
  ): Promise<void> {
    const indexRef = collection(this.firestore, `negocios/${negocioId}/productos_indexados`);
    const batch = writeBatch(this.firestore);

    for (const producto of productos) {
      const id = producto.referencia || doc(indexRef).id;

      batch.set(doc(indexRef, id), {
        ...producto,
        proveedorNif: proveedor.nif,
        proveedorNombre: proveedor.nombre,
        fechaFactura,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
  }

  private convertToDecimal(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const sanitized = value.replace(',', '.');
      const parsed = parseFloat(sanitized);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private convertToDate(value: any): Date | null {
    if (value instanceof Date) return value;
  
    if (value?.seconds) return new Date(value.seconds * 1000);
  
    if (typeof value === 'string') {
      const [fecha, hora] = value.split(' ');
      const [dia, mes, anio] = fecha.split('/').map(Number);
      const [h, m] = hora?.split(':').map(Number) ?? [0, 0];
      return new Date(anio, mes - 1, dia, h, m);
    }
  
    return null;
  }
}