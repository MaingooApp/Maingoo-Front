import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-product-price-chart',
	standalone: true,
	imports: [CommonModule, ChartModule, IconComponent],
	templateUrl: './product-price-chart.component.html'
})
export class ProductPriceChartComponent {
	@Input() data: any;
	@Input() options: any;
	@Input() title: string = 'Evolución de precio';
}
