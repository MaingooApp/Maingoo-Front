import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Supplier } from '../../../../interfaces/supplier.interface';

@Component({
	selector: 'app-supplier-delivery',
	standalone: true,
	imports: [CommonModule, FormsModule, InputTextModule, InputNumberModule, IconComponent],
	templateUrl: './supplier-delivery.component.html'
})
export class SupplierDeliveryComponent implements OnChanges {
	@Input({ required: true }) supplier!: Supplier;
	@Input() isEditing = false;

	showDelivery = false;

	selectedDays: string[] = [];
	selectedLastOrderDays: string[] = [];

	daysOptions = [
		{ label: 'Lunes', value: 'Lunes', short: 'Lun' },
		{ label: 'Martes', value: 'Martes', short: 'Mar' },
		{ label: 'Miércoles', value: 'Miércoles', short: 'Mié' },
		{ label: 'Jueves', value: 'Jueves', short: 'Jue' },
		{ label: 'Viernes', value: 'Viernes', short: 'Vie' },
		{ label: 'Sábado', value: 'Sábado', short: 'Sáb' },
		{ label: 'Domingo', value: 'Domingo', short: 'Dom' }
	];

	ngOnChanges(changes: SimpleChanges) {
		if (changes['supplier'] && this.supplier) {
			this.selectedDays = this.supplier.deliveryDays ? this.supplier.deliveryDays.split(',').map(d => d.trim()) : [];
			this.selectedLastOrderDays = this.supplier.orderDays ? this.supplier.orderDays.split(',').map(d => d.trim()) : [];
		}
	}

	toggleDay(type: 'delivery' | 'lastOrder', day: string) {
		const targetArray = type === 'delivery' ? this.selectedDays : this.selectedLastOrderDays;
		const index = targetArray.indexOf(day);

		if (index === -1) {
			targetArray.push(day);
		} else {
			targetArray.splice(index, 1);
		}

		// Sync back to supplier
		if (type === 'delivery') {
			this.supplier.deliveryDays = this.selectedDays.join(',');
		} else {
			this.supplier.orderDays = this.selectedLastOrderDays.join(',');
		}
	}

	isDaySelected(type: 'delivery' | 'lastOrder', day: string): boolean {
		const targetArray = type === 'delivery' ? this.selectedDays : this.selectedLastOrderDays;
		return targetArray.includes(day);
	}

	get hasEmptyDeliveryFields(): boolean {
		if (!this.supplier) return false;
		const minPriceEmpty =
			this.supplier.minPriceDelivery === null || this.supplier.minPriceDelivery === undefined;

		return !this.supplier.orderDays || !this.supplier.deliveryDays || minPriceEmpty;
	}
}
