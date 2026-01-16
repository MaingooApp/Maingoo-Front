import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Supplier } from '../../interfaces/supplier.interface';

@Component({
	selector: 'app-supplier-list',
	standalone: true,
	imports: [CommonModule, TableModule, ButtonModule, IconComponent],
	templateUrl: './supplier-list.component.html'
})
export class SupplierListComponent {
	@Input() suppliers: Supplier[] = [];
	@Input() selectedSupplier: Supplier | null = null;
	@Output() selectSupplier = new EventEmitter<Supplier>();

	onRowClick(supplier: Supplier) {
		this.selectSupplier.emit(supplier);
	}
}
