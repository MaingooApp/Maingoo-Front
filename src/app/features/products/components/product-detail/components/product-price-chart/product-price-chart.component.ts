import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-product-price-chart',
	standalone: true,
	imports: [CommonModule, ChartModule, IconComponent, SelectModule, FormsModule],
	templateUrl: './product-price-chart.component.html'
})
export class ProductPriceChartComponent implements OnChanges {
	@Input() data: any;
	@Input() options: any;
	@Input() title: string = 'Evolución de precio';
	@Input() product: Product | null = null; // Add Product Input

	currentData: any;
	baseData: any;

	priceOptions = [
		{ label: 'Precio Paquete', value: 'package' },
		{ label: 'Precio Unidad', value: 'unit' },
		{ label: 'Precio Kg', value: 'kg' }
	];

	selectedPriceType: string = 'package';

	ngOnChanges(changes: SimpleChanges): void {
		if ((changes['data'] && this.data) || (changes['product'] && this.product)) {
			if (this.data && !this.baseData) {
				this.baseData = JSON.parse(JSON.stringify(this.data)); // Deep copy only once or if data changes
			}
			// If data changed, update baseData
			if (changes['data'] && this.data) {
				this.baseData = JSON.parse(JSON.stringify(this.data));
			}

			this.updateChartData();
		}
	}

	updateChartData() {
		if (!this.baseData) return;

		// Clone base data to avoid mutating it
		const newData = JSON.parse(JSON.stringify(this.baseData));

		// Apply transformation based on selected type
		if (newData.datasets) {
			newData.datasets.forEach((dataset: any) => {
				// Update label based on selection
				const selectedOption = this.priceOptions.find(o => o.value === this.selectedPriceType);
				if (selectedOption) {
					dataset.label = selectedOption.label;
				}

				if (dataset.data) {
					dataset.data = dataset.data.map((value: number) => {
						switch (this.selectedPriceType) {
							case 'unit':
								if (this.product?.unitsPerPackage) {
									return Number((value / this.product.unitsPerPackage).toFixed(2));
								}
								// If unitsPerPackage is missing, it doesn't apply -> return 0
								return 0;
							case 'kg':
								// Logic: value is Price/Package (lastUnitPrice)
								// product.pricePerKg is relative to current lastUnitPrice.
								// Ratio = product.pricePerKg / product.lastUnitPrice
								// So historical value (package) * ratio => historical value (kg)
								if (this.product?.pricePerKg != null && this.product?.lastUnitPrice != null && this.product.lastUnitPrice > 0) {
									const ratio = this.product.pricePerKg / this.product.lastUnitPrice;
									return Number((value * ratio).toFixed(2));
								}
								// If pricePerKg is missing, it doesn't apply -> return 0
								return 0;
							case 'package':
							default:
								return value;
						}
					});
				}
			});
		}

		this.currentData = newData;
	}
}
