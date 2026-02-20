import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

@Component({
  selector: 'app-products-section-header-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, IconComponent, NgxPermissionsModule],
  templateUrl: './products-section-header-detail.component.html'
})
export class ProductsSectionHeaderDetailComponent {
  readonly P = AppPermission;
  @Input() productos: any[] = [];
  @Input() viewMode: 'cards' | 'list' = 'cards';
  @Input() cargando: boolean = false;

  @Output() viewModeChange = new EventEmitter<'cards' | 'list'>();
  @Output() search = new EventEmitter<Event>();
  @Output() addInvoice = new EventEmitter<void>();
  @Output() deleteAll = new EventEmitter<void>();

  setViewMode(mode: 'cards' | 'list') {
    this.viewModeChange.emit(mode);
  }

  onSearch(event: Event) {
    this.search.emit(event);
  }

  onAddInvoice() {
    this.addInvoice.emit();
  }

  onDeleteAll() {
    this.deleteAll.emit();
  }
}
