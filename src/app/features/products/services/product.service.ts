import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../../../core/services/base-http.service';
import { environment } from '../../../../environments/environment';
import { Product, ProductGroup } from '@app/core/interfaces/Invoice.interfaces';

@Injectable({ providedIn: 'root' })
export class ProductService extends BaseHttpService {
	private readonly PRODUCTS_URL = `${environment.urlBackend}api/products`;

	constructor(http: HttpClient) {
		super(http);
	}

	/**
	 * Obtiene todos los productos del inventario consolidado agrupados por categoría raíz
	 * GET /api/products
	 * @returns Array de grupos de productos, cada uno con rootCategory, productCount y products
	 */
	getProducts(): Observable<ProductGroup[]> {
		return this.get<ProductGroup[]>(this.PRODUCTS_URL);
	}

	/**
	 * Obtiene un producto específico por su ID
	 * GET /api/products/:id
	 */
	getProductById(id: string): Observable<Product> {
		return this.get<Product>(`${this.PRODUCTS_URL}/${id}`);
	}

	/**
	 * Elimina un producto por su ID
	 * DELETE /api/products/:id
	 */
	deleteProduct(id: string): Observable<void> {
		return this.delete<void>(`${this.PRODUCTS_URL}/${id}`);
	}
	/**
	 * Actualiza los datos de un producto (nombre, formato/unidad, alérgenos)
	 * PUT /api/products/:id
	 */
	updateProduct(id: string, data: { name: string; unit: string; allergenIds: string[] }): Observable<Product> {
		return this.put<Product>(`${this.PRODUCTS_URL}/${id}`, data);
	}
}
