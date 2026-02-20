import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Supplier } from '../../interfaces/supplier.interface';
import { CardShellComponent } from '@shared/components/card-shell/card-shell.component';

@Component({
	selector: 'app-supplier-card',
	standalone: true,
	imports: [CommonModule, IconComponent, CardShellComponent],
	templateUrl: './supplier-card.component.html'
})
export class SupplierCardComponent {
	@Input() supplier!: Supplier;
	@Input() isSelected: boolean = false;
	@Output() cardClick = new EventEmitter<Supplier>();

	handleClick() {
		this.cardClick.emit(this.supplier);
	}
}
