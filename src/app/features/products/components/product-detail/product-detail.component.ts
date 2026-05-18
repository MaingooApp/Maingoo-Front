import { Component, DestroyRef, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

interface PriceChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    fill: boolean;
    borderColor: string;
    backgroundColor: string;
    tension: number;
    pointBackgroundColor: string;
    pointBorderColor: string;
    pointHoverBackgroundColor: string;
    pointHoverBorderColor: string;
  }[];
}

interface TooltipContext {
  dataset: {
    label?: string;
  };
  parsed: {
    y: number | null;
  };
}

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
  private readonly destroyRef = inject(DestroyRef);

  // Internal state — previously managed by ProductosComponent
  invoices: Invoice[] = [];
  priceChartData?: PriceChartData;
  priceChartOptions?: object;

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
    this.invoiceService
      .getInvoices({ productId: product.id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoices: Invoice[]) => {
          this.invoices = invoices;
          this.buildPriceChart(product);
        },
        error: () => {
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
      result.reverse().forEach((price) => {
        const value = Number(price.price);
        labels.push(
          new Date(price.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        );
        prices.push(value);
      });
    } catch (e) {
      // If no price history, chart will remain empty — that's fine
    }

    const primaryColor = this.getCssVariable('--p-primary-color', '#4a8c68');
    const primarySoftColor = this.hexToRgba(primaryColor, 0.14);
    const surfaceColor = this.getCssVariable('--p-surface-0', '#ffffff');
    const gridColor = this.getCssVariable('--p-surface-200', '#e5e7eb');

    this.priceChartData = {
      labels,
      datasets: [
        {
          label: 'Precio por formato',
          data: prices,
          fill: true,
          borderColor: primaryColor,
          backgroundColor: primarySoftColor,
          tension: 0.4,
          pointBackgroundColor: surfaceColor,
          pointBorderColor: primaryColor,
          pointHoverBackgroundColor: primaryColor,
          pointHoverBorderColor: surfaceColor
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
            label: (context: TooltipContext) => {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                  context.parsed.y
                );
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { display: true, grid: { display: false } },
        y: { display: true, beginAtZero: true, min: 0, grid: { color: gridColor } }
      }
    };
  }

  private getCssVariable(name: string, fallback: string): string {
    if (typeof window === 'undefined') {
      return fallback;
    }

    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private hexToRgba(hexColor: string, alpha: number): string {
    const hex = hexColor.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return `rgba(74, 140, 104, ${alpha})`;
    }

    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}
