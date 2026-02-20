import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

@Component({
  selector: 'app-invoice-summary-section-header-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, IconComponent, NgxPermissionsModule],
  templateUrl: './invoice-summary-section-header-detail.component.html'
})
export class InvoiceSummarySectionHeaderDetailComponent {
  readonly P = AppPermission;
  @Output() search = new EventEmitter<Event>();
  @Output() addInvoice = new EventEmitter<void>();

  onSearch(event: Event) {
    this.search.emit(event);
  }

  onAddInvoice() {
    this.addInvoice.emit();
  }
}
