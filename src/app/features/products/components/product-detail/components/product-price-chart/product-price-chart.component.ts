import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';

export interface ProductPriceChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  tension?: number;
  fill?: boolean;
}

export interface ProductPriceChartData {
  labels: string[];
  datasets: ProductPriceChartDataset[];
}

@Component({
  selector: 'app-product-price-chart',
  standalone: true,
  imports: [CommonModule, ChartModule, IconComponent, SelectModule, FormsModule],
  templateUrl: './product-price-chart.component.html'
})
export class ProductPriceChartComponent implements OnChanges {
  @Input() data?: ProductPriceChartData;
  @Input() options?: object;
  @Input() title: string = 'Evolución de precio';
  @Input() product: Product | null = null; // Add Product Input

  currentData?: ProductPriceChartData;
  baseData?: ProductPriceChartData;

  priceOptions = [
    { label: 'Precio Paquete', value: 'package' },
    { label: 'Coste Kg', value: 'kg' },
    { label: 'Coste Litro', value: 'liter' },
    { label: 'Coste Pieza', value: 'piece' }
  ];

  selectedPriceType: string = 'package';

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] && this.data) || (changes['product'] && this.product)) {
      if (this.data && !this.baseData) {
        this.baseData = this.cloneChartData(this.data); // Deep copy only once or if data changes
      }
      // If data changed, update baseData
      if (changes['data'] && this.data) {
        this.baseData = this.cloneChartData(this.data);
      }

      this.updateChartData();
    }
  }

  updateChartData() {
    if (!this.baseData) return;

    // Clone base data to avoid mutating it
    const newData = this.cloneChartData(this.baseData);

    // Apply transformation based on selected type
    if (newData.datasets) {
      newData.datasets.forEach((dataset) => {
        // Update label based on selection
        const selectedOption = this.priceOptions.find((o) => o.value === this.selectedPriceType);
        if (selectedOption) {
          dataset.label = selectedOption.label;
        }

        if (dataset.data) {
          dataset.data = dataset.data.map((value: number) => {
            switch (this.selectedPriceType) {
              case 'kg':
                if (
                  this.product?.recipeCostPerKg != null &&
                  this.product?.lastUnitPrice != null &&
                  this.product.lastUnitPrice > 0
                ) {
                  const ratio = this.product.recipeCostPerKg / this.product.lastUnitPrice;
                  return Number((value * ratio).toFixed(2));
                }
                return 0;
              case 'liter':
                if (
                  this.product?.recipeCostPerLiter != null &&
                  this.product?.lastUnitPrice != null &&
                  this.product.lastUnitPrice > 0
                ) {
                  const ratio = this.product.recipeCostPerLiter / this.product.lastUnitPrice;
                  return Number((value * ratio).toFixed(2));
                }
                return 0;
              case 'piece':
                if (
                  this.product?.recipeCostPerPiece != null &&
                  this.product?.lastUnitPrice != null &&
                  this.product.lastUnitPrice > 0
                ) {
                  const ratio = this.product.recipeCostPerPiece / this.product.lastUnitPrice;
                  return Number((value * ratio).toFixed(2));
                }
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

  private cloneChartData(data: ProductPriceChartData): ProductPriceChartData {
    return {
      labels: [...data.labels],
      datasets: data.datasets.map((dataset) => ({
        ...dataset,
        data: [...dataset.data],
        backgroundColor: Array.isArray(dataset.backgroundColor) ? [...dataset.backgroundColor] : dataset.backgroundColor
      }))
    };
  }
}
