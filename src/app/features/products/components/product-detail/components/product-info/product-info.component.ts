import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ProductService } from '../../../../services/product.service';
import { ToastService } from '@app/shared/services/toast.service';
import { InputTextarea } from 'primeng/inputtextarea';

@Component({
	selector: 'app-product-info',
	standalone: true,
	imports: [CommonModule, IconComponent, FormsModule, InputTextarea],
	templateUrl: './product-info.component.html'
})
export class ProductInfoComponent {
	@Input() product: Product | null = null;

	private productService = inject(ProductService);
	private toastService = inject(ToastService);

	isEditing = false;
	tempDescription = '';

	startEditing() {
		this.isEditing = true;
		this.tempDescription = this.product?.description || '';
	}

	cancelEditing() {
		this.isEditing = false;
		this.tempDescription = '';
	}

	saveDescription() {
		if (!this.product) return;

		this.productService.updateProduct(this.product.id, {
			name: this.product.name,
			unit: this.product.unit,
			allergenIds: this.product.allergens.map(a => a.id),
			description: this.tempDescription
		}).subscribe({
			next: (updatedProduct) => {
				if (this.product) {
					this.product.description = updatedProduct.description;
					this.toastService.success('Descripción actualizada');
					this.isEditing = false;
				}
			},
			error: () => {
				this.toastService.error('Error al actualizar descripción');
			}
		});
	}

}
