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
	type: 'ingredient' | 'elaboration' | 'consumable';
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

	// Selección de utensilios y maquinaria
	selectedUtensils = signal<string[]>([]);
	selectedMachinery = signal<string[]>([]);

	// Listas predefinidas de utensilios
	predefinedUtensils: string[] = [
		'Tabla de cortar', 'Cuchillo cebollero', 'Cuchillo puntilla', 'Cuchillo de sierra',
		'Pelador', 'Mandolina', 'Rallador', 'Tijeras de cocina',
		'Espátula', 'Espátula de silicona', 'Lengua de silicona',
		'Varillas manuales', 'Cucharón', 'Espumadera', 'Pinzas',
		'Colador', 'Colador chino', 'Tamiz',
		'Bowl metálico', 'Bowl de cristal', 'Gastronorm',
		'Sartén', 'Olla', 'Cazo', 'Rondón', 'Bandeja de horno',
		'Manga pastelera', 'Boquillas', 'Rodillo',
		'Báscula', 'Termómetro', 'Probeta',
		'Papel de horno', 'Film transparente', 'Papel de aluminio',
		'Guantes', 'Trapo', 'Bayeta'
	];

	// Listas predefinidas de maquinaria
	predefinedMachinery: string[] = [
		'Horno convección', 'Horno mixto (rational)', 'Microondas',
		'Plancha', 'Freidora', 'Cocina de inducción', 'Cocina de gas',
		'Thermomix', 'Robot de cocina', 'Batidora de vaso', 'Batidora de mano',
		'Amasadora', 'Cortadora', 'Picadora',
		'Abatidor', 'Cámara de vacío', 'Envasadora al vacío',
		'Roner (sous vide)', 'Sifón ISI',
		'Lavavajillas industrial', 'Campana extractora',
		'Cámara frigorífica', 'Congelador', 'Nevera',
		'Salamandra', 'Soplete', 'Deshidratador'
	];

	// Sugerencias filtradas para utensilios y maquinaria
	filteredUtensils: string[] = [];
	filteredMachinery: string[] = [];

	// Ingredients State
	ingredientRows = signal<IngredientRow[]>([
		{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' }
	]);

	// Opciones de unidad de medida
	amountUnits = [
		{ label: 'Gramos', value: 'g' },
		{ label: 'Unidades', value: 'ud' }
	];

	// Sugerencias filtradas para el autocomplete
	filteredItems: any[] = [];

	ingredientTypes = [
		{ label: 'Ingrediente', value: 'ingredient' },
		{ label: 'Consumible', value: 'consumable' },
		{ label: 'Elaboración', value: 'elaboration' }
	];

	cancelForm() {
		this.resetForm();
		this.limitForm.emit(false);
	}

	resetForm() {
		this.newElaborationName.set('');
		this.elaborationSteps.set('');
		this.selectedUtensils.set([]);
		this.selectedMachinery.set([]);
		this.ingredientRows.set([
			{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' },
			{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' },
			{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' }
		]);
	}

	addIngredientRow() {
		this.ingredientRows.update(rows => [
			...rows,
			{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' }
		]);
	}

	removeIngredientRow(index: number) {
		this.ingredientRows.update(rows => rows.filter((_, i) => i !== index));
	}

	getAvailableItems(type: 'ingredient' | 'elaboration' | 'consumable'): any[] {
		if (type === 'ingredient' || type === 'consumable') {
			return this.availableProducts;
		}
		return this.elaborations;
	}

	/**
	 * Filtra los items disponibles según la búsqueda del autocomplete.
	 */
	filterItems(event: any, type: 'ingredient' | 'elaboration' | 'consumable') {
		const query = event.query.toLowerCase();
		const items = this.getAvailableItems(type);
		this.filteredItems = items.filter((item: any) =>
			item.name.toLowerCase().includes(query)
		);
	}

	/** Filtra utensilios disponibles (excluye ya seleccionados). */
	filterUtensils(event: any) {
		const query = event.query.toLowerCase();
		const selected = this.selectedUtensils();
		this.filteredUtensils = this.predefinedUtensils.filter(u =>
			u.toLowerCase().includes(query) && !selected.includes(u)
		);
	}

	/** Filtra maquinaria disponible (excluye ya seleccionada). */
	filterMachinery(event: any) {
		const query = event.query.toLowerCase();
		const selected = this.selectedMachinery();
		this.filteredMachinery = this.predefinedMachinery.filter(m =>
			m.toLowerCase().includes(query) && !selected.includes(m)
		);
	}

	/** Añade un utensilio seleccionado. */
	addUtensil(event: any) {
		const value = typeof event === 'string' ? event : event?.value;
		if (value && !this.selectedUtensils().includes(value)) {
			this.selectedUtensils.update(list => [...list, value]);
		}
	}

	/** Añade una maquinaria seleccionada. */
	addMachinery(event: any) {
		const value = typeof event === 'string' ? event : event?.value;
		if (value && !this.selectedMachinery().includes(value)) {
			this.selectedMachinery.update(list => [...list, value]);
		}
	}

	/** Elimina un utensilio de la selección. */
	removeUtensil(index: number) {
		this.selectedUtensils.update(list => list.filter((_, i) => i !== index));
	}

	/** Elimina una maquinaria de la selección. */
	removeMachinery(index: number) {
		this.selectedMachinery.update(list => list.filter((_, i) => i !== index));
	}

	/**
	 * Calcula el precio de una fila de ingrediente.
	 * - Gramos: (cantidad / 1000) * pricePerKg
	 * - Unidades: cantidad * pricePerUnit
	 */
	getRowPrice(row: IngredientRow): number | null {
		const amount = parseFloat(row.amount);
		if (!row.selectedItem || !amount || amount <= 0) return null;

		// Solo aplica para ingredientes y consumibles (las elaboraciones no tienen precio directo)
		if (row.type !== 'ingredient' && row.type !== 'consumable') return null;

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
			utensils: [...this.selectedUtensils()],
			machinery: [...this.selectedMachinery()],
			steps: this.elaborationSteps()
		});

		this.resetForm();
	}
}
