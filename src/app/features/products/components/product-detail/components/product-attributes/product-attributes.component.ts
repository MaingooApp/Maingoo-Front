import { Component, Input, OnChanges, SimpleChanges, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';
import { getCategoryStyle as getCategoryColor } from '@app/shared/helpers/category-colors.helper';
import { ProductService } from '../../../../services/product.service';
import { ToastService } from '@app/shared/services/toast.service';

@Component({
	selector: 'app-product-attributes',
	standalone: true,
	imports: [CommonModule, TagModule, TooltipModule, IconComponent, SelectModule, FormsModule],
	templateUrl: './product-attributes.component.html'
})
export class ProductAttributesComponent implements OnChanges {
	@Input() product: Product | null = null;

	private productService = inject(ProductService);
	private toastService = inject(ToastService);

	categoryPath: string[] = [];
	rootCategoryStyle: { [klass: string]: any } = {};

	// Price Logic

	get pricePerPackage(): string {
		if (this.product?.lastUnitPrice != null) {
			return `${this.product.lastUnitPrice.toFixed(2)} €`;
		}
		return '0.00 €';
	}

	get pricePerUnit(): string {
		if (this.product?.pricePerUnit != null) {
			return `${this.product.pricePerUnit.toFixed(2)} €`;
		}
		// Fallback calculation if only package price and count are known
		if (this.product?.lastUnitPrice != null && this.product?.unitsPerPackage) {
			return `${(this.product.lastUnitPrice / this.product.unitsPerPackage).toFixed(2)} €`;
		}
		return '0.00 €';
	}

	get pricePerKg(): string {
		if (this.product?.pricePerKg != null) {
			return `${this.product.pricePerKg.toFixed(2)} €`;
		}
		return '0.00 €';
	}

	// Format Options
	formatOptions: { label: string; value: string }[] = [];
	private formatsMap: { [key: string]: string } = {
		'BT': 'Botella',
		'PQ': 'Paquete',
		'CJ': 'Caja',
		'UD': 'Unidad',
		'BL': 'Bolsa',
		'BJ': 'Bandeja',
		'LT': 'Lata',
		'CB': 'Cubo',
		'FR': 'Frasco',
		'TR': 'Tarro',
		'SC': 'Saco',
		'RT': 'Retráctil',
		'BS': 'Blister',
		'ES': 'Estuche',
		'MA': 'Malla',
		'AE': 'Aerosol',
		'KG': 'Kilogramo',
		'BD': 'Bidón',
		'SB': 'Sobre',
		'PZ': 'Pieza'
	};

	@Output() priceTypeChange = new EventEmitter<string>();

	constructor() {
		this.formatOptions = Object.entries(this.formatsMap).map(([key, value]) => ({
			label: value,
			value: key
		})).sort((a, b) => a.label.localeCompare(b.label));
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['product'] && this.product) {
			this.updateCategoryData();
		}
	}

	updateFormat(newFormat: string) {
		if (!this.product) return;

		this.productService.updateProduct(this.product.id, {
			name: this.product.name,
			unit: newFormat,
			allergenIds: this.product.allergens.map(a => a.id),

		}).subscribe({
			next: (updatedProduct) => {
				if (this.product) {
					this.product.unit = updatedProduct.unit;
				}
			},
		});
	}



	private updateCategoryData() {
		if (!this.product?.category?.path) {
			this.categoryPath = this.product?.category?.name ? [this.product.category.name] : [];
		} else {
			this.categoryPath = this.product.category.path.split(' > ').map(s => s.trim());
		}

		const rootCategory = this.categoryPath.length > 0 ? this.categoryPath[0] : undefined;
		this.rootCategoryStyle = getCategoryColor(rootCategory);
	}

	getFormatName(code: string | undefined): string {
		if (!code) return 'Desconocido';
		return this.formatsMap[code.toUpperCase()] || code;
	}

	setStorageType(type: 'seco' | 'fresco' | 'congelado') {
		if (this.product) {
			this.product.storageType = type;
			// In a real app, emit change event
		}
	}
}
