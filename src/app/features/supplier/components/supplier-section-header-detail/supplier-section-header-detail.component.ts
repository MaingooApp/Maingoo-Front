import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Supplier } from '../../interfaces/supplier.interface';

@Component({
  selector: 'app-supplier-section-header-detail',
  standalone: true,
  imports: [CommonModule, InputTextModule, IconComponent],
  templateUrl: './supplier-section-header-detail.component.html'
})
export class SupplierSectionHeaderDetailComponent {
  @Input() supplier: Supplier[] = [];

  @Output() search = new EventEmitter<Event>();

  onSearch(event: Event) {
    this.search.emit(event);
  }
}
