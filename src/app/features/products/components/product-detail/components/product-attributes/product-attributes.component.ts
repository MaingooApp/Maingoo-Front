import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';
import { getCategoryStyle as getCategoryColor } from '@app/shared/helpers/category-colors.helper';
import { ProductService } from '../../../../services/product.service';
import { ToastService } from '@app/shared/services/toast.service';

@Component({
  selector: 'app-product-attributes',
  standalone: true,
  imports: [CommonModule, TagModule, TooltipModule, IconComponent, SelectModule, FormsModule],
  templateUrl: './product-attributes.component.html'
})
export class ProductAttributesComponent implements OnChanges {
  @Input() product: Product | null = null;

  private productService = inject(ProductService);
  private toastService = inject(ToastService);

  categoryPath: string[] = [];
  rootCategoryStyle: Record<string, string> = {};

  // Price Logic

  get pricePerPackage(): string {
    if (this.product?.lastUnitPrice != null) {
      return `${this.product.lastUnitPrice.toFixed(2)} €`;
    }
    return '0.00 €';
  }

  get recipeCostPerPiece(): string {
    return this.product?.recipeCostPerPiece != null ? `${this.product.recipeCostPerPiece.toFixed(2)} €` : '—';
  }

  get recipeCostPerKg(): string {
    return this.product?.recipeCostPerKg != null ? `${this.product.recipeCostPerKg.toFixed(2)} €` : '—';
  }

  get recipeCostPerLiter(): string {
    return this.product?.recipeCostPerLiter != null ? `${this.product.recipeCostPerLiter.toFixed(2)} €` : '—';
  }

  // Format Options
  formatOptions: { label: string; value: string }[] = [];
  private formatsMap: { [key: string]: string } = {
    BT: 'Botella',
    PQ: 'Paquete',
    CJ: 'Caja',
    UD: 'Unidad',
    BL: 'Bolsa',
    BJ: 'Bandeja',
    LT: 'Lata',
    CB: 'Cubo',
    FR: 'Frasco',
    TR: 'Tarro',
    SC: 'Saco',
    RT: 'Retráctil',
    BS: 'Blister',
    ES: 'Estuche',
    MA: 'Malla',
    AE: 'Aerosol',
    KG: 'Kilogramo',
    BD: 'Bidón',
    SB: 'Sobre',
    PZ: 'Pieza'
  };

  constructor() {
    this.formatOptions = Object.entries(this.formatsMap)
      .map(([key, value]) => ({
        label: value,
        value: key
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      this.updateCategoryData();
    }
  }

  updateFormat(newFormat: string) {
    if (!this.product) return;

    this.productService
      .updateProduct(this.product.id, {
        name: this.product.name,
        unit: newFormat,
        allergenIds: this.product.allergens.map((a) => a.id)
      })
      .subscribe({
        next: (updatedProduct) => {
          if (this.product) {
            this.product.unit = updatedProduct.unit;
          }
        }
      });
  }

  private updateCategoryData() {
    if (!this.product?.category?.path) {
      this.categoryPath = this.product?.category?.name ? [this.product.category.name] : [];
    } else {
      this.categoryPath = this.product.category.path.split(' > ').map((s) => s.trim());
    }

    const rootCategory = this.categoryPath.length > 0 ? this.categoryPath[0] : undefined;
    this.rootCategoryStyle = getCategoryColor(rootCategory);
  }

  getFormatName(code: string | undefined): string {
    if (!code) return 'Desconocido';
    return this.formatsMap[code.toUpperCase()] || code;
  }

  setStorageType(type: 'seco' | 'fresco' | 'congelado') {
    if (this.product) {
      this.product.storageType = type;
      // In a real app, emit change event
    }
  }
}
