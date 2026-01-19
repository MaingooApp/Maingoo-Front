import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextarea } from 'primeng/inputtextarea';
import { Product } from '@app/core/interfaces/Invoice.interfaces';

export interface IngredientRow {
	type: 'product' | 'elaboration';
	selectedItem: any;
	amount: string;
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
		{ type: 'product', selectedItem: null, amount: '' },
		{ type: 'product', selectedItem: null, amount: '' },
		{ type: 'product', selectedItem: null, amount: '' }
	]);

	ingredientTypes = [
		{ label: 'Ingrediente', value: 'product' },
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
			{ type: 'product', selectedItem: null, amount: '' },
			{ type: 'product', selectedItem: null, amount: '' },
			{ type: 'product', selectedItem: null, amount: '' }
		]);
	}

	addIngredientRow() {
		this.ingredientRows.update(rows => [
			...rows,
			{ type: 'product', selectedItem: null, amount: '' }
		]);
	}

	removeIngredientRow(index: number) {
		this.ingredientRows.update(rows => rows.filter((_, i) => i !== index));
	}

	getAvailableItems(type: 'product' | 'elaboration'): any[] {
		if (type === 'product') {
			return this.availableProducts;
		}
		return this.elaborations; // Recursive elaborations? For now just use the list we have
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
