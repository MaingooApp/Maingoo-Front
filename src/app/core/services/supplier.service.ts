import { Injectable } from '@angular/core';
import { AuthService } from './auth-service.service';
import { collection, Firestore, getDocs, where, query } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

  constructor(private authService: AuthService, private firestore: Firestore) { }

  async checkProveedorPorNif(nif: string): Promise<boolean> {
    const uid = this.authService.currentUser?.uid;
    if (!uid) return false;
    const negocioId = await this.authService.getNegocioId(uid);
    if (!negocioId) return false;
  
    const proveedoresRef = collection(this.firestore, `negocios/${negocioId}/proveedores`);
    const q = query(proveedoresRef, where('nif', '==', nif));
    const snapshot = await getDocs(q);
  
    return !snapshot.empty; 
  }
  
  
}
