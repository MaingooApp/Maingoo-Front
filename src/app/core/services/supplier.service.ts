import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, Firestore, getDoc, getDocs, setDoc } from '@angular/fire/firestore';
import { Supplier } from '../interfaces/supplier.interface';
import { AuthService } from './auth-service.service';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

  constructor(private authService: AuthService, private firestore: Firestore) { }

  async checkProveedorPorNif(nif: string): Promise<boolean> {
    const negocioId = await this.authService.getNegocioId();
    if (!negocioId) return false;

    const id = this.sanitizeId(nif);
    const ref = doc(this.firestore, `negocios/${negocioId}/proveedores/${id}`);
    const snap = await getDoc(ref);

    return snap.exists();
  }

  async agregarProveedor(proveedor: any): Promise<void> {
    const negocioId = await this.authService.getNegocioId();
    if (!negocioId) {
      throw new Error('No se pudo determinar el negocio del usuario');
    }

    const id = this.sanitizeId(proveedor.nif);
    const ref = doc(this.firestore, `negocios/${negocioId}/proveedores/${id}`);

    await setDoc(ref, { ...proveedor, id });
  }

  async getProveedores(): Promise<Supplier[]> {
    const negocioId = await this.authService.getNegocioId();
    if (!negocioId) return [];

    const ref = collection(this.firestore, `negocios/${negocioId}/proveedores`);
    const snap = await getDocs(ref);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Supplier));
  }

  async deleteSupplier(nif: string): Promise<void> {
    const negocioId = await this.authService.getNegocioId();
    if (!negocioId) throw new Error('No se pudo obtener el negocio');

    const id = this.sanitizeId(nif);
    const ref = doc(this.firestore, `negocios/${negocioId}/proveedores/${id}`);
    await deleteDoc(ref);
  }

  sanitizeId(nif: string): string {
    return nif.replace(/[\/.#\[\]]/g, '_');
  }
}
