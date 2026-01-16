import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common'; // For ngIf, ngFor, date, currency
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { Product, Invoice } from '@app/core/interfaces/Invoice.interfaces';

import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { getCategoryStyle as getCategoryColor } from '@app/shared/helpers/category-colors.helper';

@Component({
  selector: 'app-product-detail-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ChartModule,
    IconComponent
  ],
  templateUrl: './product-detail-sidebar.component.html'
})
export class ProductDetailSidebarComponent {
  @Input() product: Product | null = null;
  @Input() relatedInvoices: Invoice[] = [];
  @Input() priceChartData: any;
  @Input() priceChartOptions: any;

  @Output() close = new EventEmitter<void>();
  @Output() verFactura = new EventEmitter<Invoice>();
  @Output() delete = new EventEmitter<Product>();

  showMenu: boolean = false;

  setStorageType(type: 'seco' | 'fresco' | 'congelado') {
    if (this.product) {
      this.product.storageType = type;
      // In a real app, you would emit an update event here or call a service
      // this.update.emit(this.product);
    }
  }



  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  onDelete() {
    if (this.product) {
      this.delete.emit(this.product);
    }
  }

  getCategoryStyle(category: string | undefined): { [klass: string]: any } {
    return getCategoryColor(category);
  }

  /**
   * Parses the category path string into an array of category names
   * e.g., "Bebidas > Espirituosos > Cremas de licor" -> ["Bebidas", "Espirituosos", "Cremas de licor"]
   */
  getCategoryPathParts(): string[] {
    if (!this.product?.category?.path) {
      // Fallback to just category name if no path
      return this.product?.category?.name ? [this.product.category.name] : [];
    }
    return this.product.category.path.split(' > ').map(s => s.trim());
  }

  getFormatName(code: string | undefined): string {
    if (!code) return 'Desconocido';
    const formats: { [key: string]: string } = {
      'BT': 'Botella',
      'PQ': 'Paquete',
      'CJ': 'Caja',
      'UD': 'Unidad',
      'BL': 'Bolsa',
      'BJ': 'Bandeja',
      'LT': 'Lata',
      'CB': 'Cubo',
      'FR': 'Frasco',
      'TR': 'Tarro',
      'SC': 'Saco',
      'RT': 'Retráctil',
      'BS': 'Blister',
      'ES': 'Estuche',
      'MA': 'Malla',
      'AE': 'Aerosol',
      'KG': 'Kilogramo',
      'BD': 'Bidón'
    };
    return formats[code.toUpperCase()] || code;
  }
}
