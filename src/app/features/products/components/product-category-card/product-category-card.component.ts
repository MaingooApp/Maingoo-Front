import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductGroup } from '@app/core/interfaces/Invoice.interfaces';
import { CardShellComponent } from '@shared/components/card-shell/card-shell.component';
import { getCategoryStyle } from '@app/shared/helpers/category-colors.helper';

@Component({
	selector: 'app-product-category-card',
	standalone: true,
	imports: [CommonModule, CardShellComponent],
	templateUrl: './product-category-card.component.html'
})
export class ProductCategoryCardComponent {
	@Input() group?: ProductGroup;
	@Input() product?: Product;
	@Input() isSelected: boolean = false;
	@Output() cardClick = new EventEmitter<void>();

	getCategoryStyle(name: string) {
		return getCategoryStyle(name);
	}

	handleClick() {
		this.cardClick.emit();
	}
}
