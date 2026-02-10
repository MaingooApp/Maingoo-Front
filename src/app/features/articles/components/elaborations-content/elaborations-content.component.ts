import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputTextarea } from 'primeng/inputtextarea';
import { Product } from '@app/core/interfaces/Invoice.interfaces';

export interface IngredientRow {
	type: 'product' | 'elaboration';
	selectedItem: any;
	amount: string;
	unit: 'g' | 'ud';
}

@Component({
	selector: 'app-elaborations-content',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		IconComponent,
		ButtonModule,
		InputTextModule,
		DropdownModule,
		AutoCompleteModule,
		InputTextarea
	],
	templateUrl: './elaborations-content.component.html'
})
export class ElaborationsContentComponent {
	@Input() elaborations: { name: string; ingredients: IngredientRow[]; materials: string; steps: string }[] = [];
	@Input() availableProducts: Product[] = [];
	@Input() showForm: boolean = false;

	@Output() limitForm = new EventEmitter<boolean>();
	@Output() save = new EventEmitter<any>();

	// Form State
	newElaborationName = signal<string>('');
	elaborationSteps = signal<string>('');
	elaborationMaterials = signal<string>('');

	// Ingredients State
	ingredientRows = signal<IngredientRow[]>([
		{ type: 'product', selectedItem: null, amount: '', unit: 'g' },
		{ type: 'product', selectedItem: null, amount: '', unit: 'g' },
		{ type: 'product', selectedItem: null, amount: '', unit: 'g' }
	]);

	// Opciones de unidad de medida
	amountUnits = [
		{ label: 'Gramos', value: 'g' },
		{ label: 'Unidades', value: 'ud' }
	];

	// Sugerencias filtradas para el autocomplete
	filteredItems: any[] = [];

	ingredientTypes = [
		{ label: 'Producto', value: 'product' },
		{ label: 'Elaboración', value: 'elaboration' }
	];

	cancelForm() {
		this.resetForm();
		this.limitForm.emit(false);
	}

	resetForm() {
		this.newElaborationName.set('');
		this.elaborationSteps.set('');
		this.elaborationMaterials.set('');
		this.ingredientRows.set([
			{ type: 'product', selectedItem: null, amount: '', unit: 'g' },
			{ type: 'product', selectedItem: null, amount: '', unit: 'g' },
			{ type: 'product', selectedItem: null, amount: '', unit: 'g' }
		]);
	}

	addIngredientRow() {
		this.ingredientRows.update(rows => [
			...rows,
			{ type: 'product', selectedItem: null, amount: '', unit: 'g' }
		]);
	}

	removeIngredientRow(index: number) {
		this.ingredientRows.update(rows => rows.filter((_, i) => i !== index));
	}

	getAvailableItems(type: 'product' | 'elaboration'): any[] {
		if (type === 'product') {
			return this.availableProducts;
		}
		return this.elaborations;
	}

	/**
	 * Filtra los items disponibles según la búsqueda del autocomplete.
	 */
	filterItems(event: any, type: 'product' | 'elaboration') {
		const query = event.query.toLowerCase();
		const items = this.getAvailableItems(type);
		this.filteredItems = items.filter((item: any) =>
			item.name.toLowerCase().includes(query)
		);
	}

	/**
	 * Calcula el precio de una fila de ingrediente.
	 * - Gramos: (cantidad / 1000) * pricePerKg
	 * - Unidades: cantidad * pricePerUnit
	 */
	getRowPrice(row: IngredientRow): number | null {
		const amount = parseFloat(row.amount);
		if (!row.selectedItem || !amount || amount <= 0) return null;

		// Solo aplica para productos (las elaboraciones no tienen precio directo)
		if (row.type !== 'product') return null;

		const product = row.selectedItem as Product;

		if (row.unit === 'g') {
			if (product.pricePerKg != null && product.pricePerKg > 0) {
				return (amount / 1000) * product.pricePerKg;
			}
			return null;
		}

		if (row.unit === 'ud') {
			if (product.pricePerUnit != null && product.pricePerUnit > 0) {
				return amount * product.pricePerUnit;
			}
			return null;
		}

		return null;
	}

	onSave() {
		if (!this.newElaborationName().trim()) return;

		this.save.emit({
			name: this.newElaborationName(),
			ingredients: [...this.ingredientRows()],
			materials: this.elaborationMaterials(),
			steps: this.elaborationSteps()
		});

		this.resetForm();
	}
}
