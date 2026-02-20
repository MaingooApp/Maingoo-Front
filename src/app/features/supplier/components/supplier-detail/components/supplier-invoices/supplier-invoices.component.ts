import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Invoice } from '../../../../../../core/interfaces/Invoice.interfaces';
import { Supplier } from '../../../../interfaces/supplier.interface';

@Component({
	selector: 'app-supplier-invoices',
	standalone: true,
	imports: [CommonModule, ButtonModule, TooltipModule, IconComponent],
	templateUrl: './supplier-invoices.component.html'
})
export class SupplierInvoicesComponent {
	@Input() invoices: Invoice[] = [];
	@Input() supplier: Supplier | null = null;
	@Output() viewInvoice = new EventEmitter<Invoice>();

	showInvoices = false;
}
