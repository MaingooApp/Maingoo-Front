import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';
import { getCategoryStyle as getCategoryColor } from '@app/shared/helpers/category-colors.helper';

@Component({
	selector: 'app-product-attributes',
	standalone: true,
	imports: [CommonModule, TagModule, TooltipModule, IconComponent],
	templateUrl: './product-attributes.component.html'
})
export class ProductAttributesComponent {
	@Input() product: Product | null = null;

	getCategoryStyle(category: string | undefined): { [klass: string]: any } {
		return getCategoryColor(category);
	}

	getCategoryPathParts(): string[] {
		if (!this.product?.category?.path) {
			return this.product?.category?.name ? [this.product.category.name] : [];
		}
		return this.product.category.path.split(' > ').map(s => s.trim());
	}

	getFormatName(code: string | undefined): string {
		if (!code) return 'Desconocido';
		const formats: { [key: string]: string } = {
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
		return formats[code.toUpperCase()] || code;
	}

	setStorageType(type: 'seco' | 'fresco' | 'congelado') {
		if (this.product) {
			this.product.storageType = type;
			// In a real app, emit change event
		}
	}
}
