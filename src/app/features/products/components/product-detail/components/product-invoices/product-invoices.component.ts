import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-product-invoices',
	standalone: true,
	imports: [CommonModule, IconComponent],
	templateUrl: './product-invoices.component.html'
})
export class ProductInvoicesComponent {
	@Input() invoices: Invoice[] = [];
	@Output() viewInvoice = new EventEmitter<Invoice>();
}
