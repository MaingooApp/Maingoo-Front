import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ListShellComponent } from '@shared/components/list-shell/list-shell.component';

@Component({
	selector: 'app-product-list',
	standalone: true,
	imports: [CommonModule, TableModule, ButtonModule, IconComponent, ListShellComponent],
	templateUrl: './product-list.component.html'
})
export class ProductListComponent {
	@Input() products: Product[] = [];
	@Input() selectedProduct: Product | null = null;
	@Input() loading: boolean = false;
	@Input() isNested: boolean = false;
	@Output() selectProduct = new EventEmitter<Product>();

	onRowClick(product: Product) {
		this.selectProduct.emit(product);
	}
}
