import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Product, Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { InvoiceService } from '@features/invoices/services/invoice.service';
import { SupplierService } from '@features/supplier/services/supplier.service';
import { ToastService } from '@app/shared/services/toast.service';
import { firstValueFrom } from 'rxjs';

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
    ProductAttributesComponent,
    ProductInfoComponent,
    ProductPriceChartComponent,
    ProductInvoicesComponent
  ],
  templateUrl: './product-detail.component.html'
})
export class ProductDetailComponent implements OnChanges {
  @Input() product: Product | null = null;

  @Output() verFactura = new EventEmitter<Invoice>();

  private invoiceService = inject(InvoiceService);
  private supplierService = inject(SupplierService);
  private toastService = inject(ToastService);

  // Internal state — previously managed by ProductosComponent
  invoices: Invoice[] = [];
  priceChartData: any;
  priceChartOptions: any;

  /**
   * When the product input changes, fetch related invoices and build the chart.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      this.loadProductDetail(this.product);
    }
  }

  /**
   * Fetches invoices for the selected product and builds the price chart.
   */
  private loadProductDetail(product: Product) {
    // Fetch related invoices
    this.invoiceService.getInvoices({ productId: product.id }).subscribe({
      next: (invoices: Invoice[]) => {
        this.invoices = invoices;
        this.buildPriceChart(product);
      },
      error: (error: any) => {
        console.error('Error al cargar facturas:', error);
        this.toastService.error('Error', 'No se pudieron cargar las facturas.');
      }
    });
  }

  /**
   * Builds the base price chart data (always "package" price).
   * The ProductPriceChartComponent handles unit/kg conversions internally using its selector.
   */
  private async buildPriceChart(product: Product) {
    const labels: string[] = [];
    const prices: number[] = [];

    try {
      const result = await firstValueFrom(this.supplierService.getPriceHistory(product.id));

      // Reverse to show oldest first (API returns newest first)
      result.reverse().forEach((price: any) => {
        const value = Number(price.price);
        labels.push(
          new Date(price.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        );
        prices.push(value);
      });
    } catch (e) {
      // If no price history, chart will remain empty — that's fine
    }

    this.priceChartData = {
      labels,
      datasets: [
        {
          label: 'Precio por formato',
          data: prices,
          fill: true,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#6366f1',
          pointHoverBackgroundColor: '#6366f1',
          pointHoverBorderColor: '#ffffff'
        }
      ]
    };

    this.priceChartOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context: any) => {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { display: true, grid: { display: false } },
        y: { display: true, beginAtZero: false, grid: { color: '#f3f4f6' } }
      }
    };
  }
}
