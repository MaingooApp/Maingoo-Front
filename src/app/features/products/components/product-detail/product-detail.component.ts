import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common'; // For ngIf, ngFor, date, currency
import { ButtonModule } from 'primeng/button';
import { Product, Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ProductAttributesComponent } from './components/product-attributes/product-attributes.component';
import { ProductInfoComponent } from './components/product-info/product-info.component';
import { ProductPriceChartComponent } from './components/product-price-chart/product-price-chart.component';
import { ProductInvoicesComponent } from './components/product-invoices/product-invoices.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    IconComponent,
    ProductAttributesComponent,
    ProductInfoComponent,
    ProductPriceChartComponent,
    ProductInvoicesComponent
  ],
  templateUrl: './product-detail.component.html'
})
export class ProductDetailComponent {
  @Input() product: Product | null = null;
  @Input() relatedInvoices: Invoice[] = [];
  @Input() priceChartData: any;
  @Input() priceChartOptions: any;

  @Output() verFactura = new EventEmitter<Invoice>();
}
