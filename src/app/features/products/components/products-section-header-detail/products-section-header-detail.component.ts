import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';
import { Product } from '@app/core/interfaces/Invoice.interfaces';

@Component({
  selector: 'app-products-section-header-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, IconComponent, NgxPermissionsModule],
  templateUrl: './products-section-header-detail.component.html'
})
export class ProductsSectionHeaderDetailComponent {
  readonly P = AppPermission;
  @Input() productos: Product[] = [];
  @Input() cargando: boolean = false;

  @Output() search = new EventEmitter<Event>();
  @Output() deleteAll = new EventEmitter<void>();

  onSearch(event: Event) {
    this.search.emit(event);
  }

  onDeleteAll() {
    this.deleteAll.emit();
  }
}
