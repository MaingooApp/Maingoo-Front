import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DetailCardShellComponent } from '../../../../shared/components/detail-card-shell/detail-card-shell.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Supplier } from '../../interfaces/supplier.interface';
import { Invoice } from '../../../../core/interfaces/Invoice.interfaces';
import { SupplierContactComponent } from './components/supplier-contact/supplier-contact.component';
import { SupplierDeliveryComponent } from './components/supplier-delivery/supplier-delivery.component';
import { SupplierStatsComponent } from './components/supplier-stats/supplier-stats.component';
import { SupplierInvoicesComponent } from './components/supplier-invoices/supplier-invoices.component';

@Component({
	selector: 'app-supplier-detail',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		TooltipModule,
		DetailCardShellComponent,
		IconComponent,
		SupplierContactComponent,
		SupplierDeliveryComponent,
		SupplierStatsComponent,
		SupplierInvoicesComponent
	],
	templateUrl: './supplier-detail.component.html'
})
export class SupplierDetailComponent {
	@Input({ required: true }) supplier!: Supplier;
	@Input() invoices: Invoice[] = [];

	@Output() close = new EventEmitter<void>();
	@Output() save = new EventEmitter<Supplier>();
	@Output() delete = new EventEmitter<Supplier>();
	@Output() viewInvoice = new EventEmitter<Invoice>();

	isEditing = false;

	toggleEdit() {
		if (this.isEditing) {
			this.save.emit(this.supplier);
		} else {
			this.isEditing = true;
		}
	}

	confirmDelete() {
		this.delete.emit(this.supplier);
	}

	onSaveSuccess() {
		this.isEditing = false;
	}
}
