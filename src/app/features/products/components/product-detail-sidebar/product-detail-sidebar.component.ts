import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common'; // For ngIf, ngFor, date, currency
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { Product, Invoice } from '@app/core/interfaces/Invoice.interfaces';

@Component({
  selector: 'app-product-detail-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ChartModule
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
    if (!category) return {};

    switch (category.toLowerCase()) {
      case 'frutas':
      case 'verduras':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'carnes':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      case 'lacteos':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'bebidas':
        return { backgroundColor: '#fef9c3', color: '#854d0e' };
      case 'limpieza':
        return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
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
      'TA': 'Tarro',
      'SC': 'Saco',
      'RT': 'Retráctil',
      'BS': 'Blister',
      'ES': 'Estuche',
      'MA': 'Malla',
      'AE': 'Aerosol',
      'KG': 'Kilogramo'
    };
    return formats[code.toUpperCase()] || code;
  }
}
