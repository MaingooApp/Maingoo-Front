import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-product-info',
	standalone: true,
	imports: [CommonModule, IconComponent],
	templateUrl: './product-info.component.html'
})
export class ProductInfoComponent {
	@Input() product: Product | null = null;
}
