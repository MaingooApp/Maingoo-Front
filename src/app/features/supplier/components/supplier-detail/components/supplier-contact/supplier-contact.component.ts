import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Supplier } from '../../../../interfaces/supplier.interface';

@Component({
	selector: 'app-supplier-contact',
	standalone: true,
	imports: [CommonModule, FormsModule, InputTextModule, IconComponent],
	templateUrl: './supplier-contact.component.html'
})
export class SupplierContactComponent {
	@Input({ required: true }) supplier!: Supplier;
	@Input() isEditing = false;

	showContact = false;

	get hasEmptyContactFields(): boolean {
		if (!this.supplier) return false;
		return (
			!this.supplier.commercialName ||
			!this.supplier.phoneNumber ||
			!this.supplier.commercialEmail
		);
	}
}
