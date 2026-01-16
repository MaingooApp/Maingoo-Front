import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { ProductListComponent } from '@features/products/components/product-list/product-list.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { getCategoryStyle } from '@app/shared/helpers/category-colors.helper';

@Component({
	selector: 'app-category-detail',
	standalone: true,
	imports: [CommonModule, ProductListComponent, IconComponent],
	templateUrl: './category-detail.component.html'
})
export class CategoryDetailComponent {
	@Input() categoryName: string | null = null;
	@Input() products: Product[] = [];
	@Input() selectedProduct: Product | null = null;
	@Output() close = new EventEmitter<void>();
	@Output() selectProduct = new EventEmitter<Product>();

	getCategoryStyle(name: string | null) {
		return getCategoryStyle(name);
	}

	onClose() {
		this.close.emit();
	}

	onSelectProduct(product: Product) {
		this.selectProduct.emit(product);
	}
}
