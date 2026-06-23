import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ListShellComponent } from '@shared/components/list-shell/list-shell.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, IconComponent, ListShellComponent, NgxPermissionsModule],
  templateUrl: './product-list.component.html'
})
export class ProductListComponent {
  readonly P = AppPermission;

  @Input() products: Product[] = [];
  @Input() selectedProduct: Product | null = null;
  @Input() loading: boolean = false;
  @Input() isNested: boolean = false;
  @Input() showStock: boolean = true;
  @Input() showDeleteAction: boolean = false;
  @Output() selectProduct = new EventEmitter<Product>();
  @Output() deleteProduct = new EventEmitter<Product>();

  get tableColumnCount(): number {
    return 3 + (this.showStock && !this.selectedProduct ? 1 : 0) + (!this.selectedProduct ? 1 : 0);
  }

  onRowClick(product: Product) {
    this.selectProduct.emit(product);
  }

  onDeleteClick(product: Product, event: Event) {
    event.stopPropagation();
    this.deleteProduct.emit(product);
  }
}
