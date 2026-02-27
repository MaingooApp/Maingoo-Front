import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MultiSelectModule } from 'primeng/multiselect';
import { Textarea } from 'primeng/textarea';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { ToastService } from '@shared/services/toast.service';
import {
  FoodPreparation,
  FoodPreparationType,
  Utensil,
  Machinery,
  CreateFoodPreparationDto,
  UpdateFoodPreparationDto
} from '../../interfaces/food-preparation.interfaces';
import { UtensilService } from '../../services/utensil.service';
import { MachineryService } from '../../services/machinery.service';
import { FoodPreparationService } from '../../services/food-preparation.service';
import { FoodPreparationTypeService } from '../../services/food-preparation-type.service';

export interface IngredientRow {
  type: 'ingredient' | 'elaboration';
  selectedItem: any;
  amount: string;
  unit: 'g' | 'ud';
}

@Component({
  selector: 'app-preparations-content',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonModule,
    InputTextModule,
    SelectModule,
    AutoCompleteModule,
    MultiSelectModule,
    Textarea,
    MenuModule
  ],
  templateUrl: './preparations-content.component.html'
})
export class PreparationsContentComponent implements OnInit {
  private utensilService = inject(UtensilService);
  private machineryService = inject(MachineryService);
  private foodPreparationService = inject(FoodPreparationService);
  private foodPreparationTypeService = inject(FoodPreparationTypeService);
  private toastService = inject(ToastService);

  @Input() availableProducts: Product[] = [];
  /** 'elaboration' or 'article' — determines which FoodPreparationType to filter by */
  @Input() type: 'elaboration' | 'article' = 'elaboration';

  // ─── Dynamic labels based on type ─────────────────────────────────────────
  get typeLabel(): string {
    return this.type === 'elaboration' ? 'elaboración' : 'artículo';
  }
  get typeLabelPlural(): string {
    return this.type === 'elaboration' ? 'elaboraciones' : 'artículos';
  }
  get typeIcon(): string {
    return this.type === 'elaboration' ? 'skillet' : 'brunch_dining';
  }

  // ─── Internal data ────────────────────────────────────────────────────────
  preparations = signal<FoodPreparation[]>([]);
  allElaborations = signal<FoodPreparation[]>([]);
  preparationType = signal<FoodPreparationType | null>(null);

  // ─── Shell State ────────────────────────────────────────────────────────────
  selectedPreparation = signal<FoodPreparation | null>(null);
  isLoadingDetail = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingId = signal<string | null>(null);

  // ─── Form State ─────────────────────────────────────────────────────────────
  newPreparationName = signal<string>('');
  preparationSteps = signal<string>('');
  isSaving = signal<boolean>(false);

  get isShellOpen(): boolean {
    return this.selectedPreparation() !== null || this.isEditMode();
  }

  get isEditing(): boolean {
    return this.editingId() !== null;
  }

  // ─── Context menu ────────────────────────────────────────────────────────────
  menuItems = signal<MenuItem[]>([]);
  activeMenuPreparation: FoodPreparation | null = null;

  // ─── Utensilios & Maquinaria (del API) ─────────────────────────────────────
  allUtensils = signal<Utensil[]>([]);
  allMachinery = signal<Machinery[]>([]);
  selectedUtensils = signal<Utensil[]>([]);
  selectedMachinery = signal<Machinery[]>([]);

  // ─── Ingredientes ───────────────────────────────────────────────────────────
  ingredientRows = signal<IngredientRow[]>([{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' }]);

  amountUnits = [
    { label: 'Gramos', value: 'g' },
    { label: 'Unidades', value: 'ud' }
  ];

  filteredItems: any[] = [];

  ingredientTypes = [
    { label: 'Ingrediente', value: 'ingredient' },
    { label: 'Elaboración', value: 'elaboration' }
  ];

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit() {
    this.loadPreparations();
    this.loadPreparationType();
    this.utensilService.getUtensils().subscribe({
      next: (utensils) => this.allUtensils.set(utensils),
      error: () => {}
    });
    this.machineryService.getMachinery().subscribe({
      next: (machinery) => this.allMachinery.set(machinery),
      error: () => {}
    });
  }

  loadPreparations() {
    this.foodPreparationService.getAll().subscribe({
      next: (all) => {
        this.preparations.set(all.filter((p) => p.type?.type === this.type));
        this.allElaborations.set(all.filter((p) => p.type?.type === 'elaboration'));
      },
      error: () => {}
    });
  }

  private loadPreparationType() {
    this.foodPreparationTypeService.getTypes().subscribe({
      next: (types) => {
        const found = types.find((t) => t.type === this.type) ?? null;
        this.preparationType.set(found);
      },
      error: () => {}
    });
  }

  // ─── Shell navigation ───────────────────────────────────────────────────────
  openDetail(preparation: FoodPreparation) {
    this.isEditMode.set(false);
    this.resetForm();
    this.isLoadingDetail.set(true);
    this.selectedPreparation.set(preparation);
    this.foodPreparationService.getOne(preparation.id).subscribe({
      next: (full) => {
        this.selectedPreparation.set(full);
        this.isLoadingDetail.set(false);
      },
      error: () => {
        this.isLoadingDetail.set(false);
      }
    });
  }

  closeDetail() {
    this.selectedPreparation.set(null);
    this.isEditMode.set(false);
    this.resetForm();
  }

  startCreate() {
    this.resetForm();
    this.selectedPreparation.set(null);
    this.editingId.set(null);
    this.isEditMode.set(true);
  }

  toggleEditMode() {
    const detail = this.selectedPreparation();
    if (!detail) return;

    this.editingId.set(detail.id);
    this.newPreparationName.set(detail.name);
    this.preparationSteps.set(detail.steps ?? '');

    const ingredientRows: IngredientRow[] = (detail.ingredients ?? []).map((ing) => {
      const fullProduct = this.availableProducts.find((p) => p.id === ing.enterpriseProductId);
      return {
        type: 'ingredient' as const,
        selectedItem:
          fullProduct ??
          (ing.enterpriseProduct?.productBase
            ? { id: ing.enterpriseProductId, name: ing.enterpriseProduct.productBase.name }
            : { id: ing.enterpriseProductId, name: ing.enterpriseProductId }),
        amount: String(ing.quantity),
        unit: (ing.measure === 'ud' ? 'ud' : 'g') as 'g' | 'ud'
      };
    });

    const subRows: IngredientRow[] = (detail.subPreparations ?? []).map((sub) => {
      const fullPrep = this.preparations().find((e) => e.id === sub.oldFoodPreparationId);
      return {
        type: 'elaboration' as const,
        selectedItem:
          fullPrep ??
          (sub.oldFoodPreparation
            ? { id: sub.oldFoodPreparationId, name: sub.oldFoodPreparation.name }
            : { id: sub.oldFoodPreparationId, name: sub.oldFoodPreparationId }),
        amount: String(sub.quantity),
        unit: (sub.measure === 'ud' ? 'ud' : 'g') as 'g' | 'ud'
      };
    });

    const allRows = [...ingredientRows, ...subRows];
    this.ingredientRows.set(
      allRows.length > 0 ? allRows : [{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' }]
    );

    this.selectedUtensils.set((detail.preparationUtensils ?? []).map((u) => u.utensil));
    this.selectedMachinery.set((detail.preparationMachinery ?? []).map((m) => m.machinery));

    this.isEditMode.set(true);
  }

  // ─── Context menu ────────────────────────────────────────────────────────────
  openMenu(event: Event, preparation: FoodPreparation, menu: any) {
    event.stopPropagation();
    this.activeMenuPreparation = preparation;
    this.menuItems.set([
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          this.openDetail(preparation);
          const interval = setInterval(() => {
            if (!this.isLoadingDetail()) {
              clearInterval(interval);
              this.toggleEditMode();
            }
          }, 100);
        }
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        styleClass: 'text-red-500',
        command: () => this.deletePreparation(preparation)
      }
    ]);
    menu.toggle(event);
  }

  deletePreparation(preparation: FoodPreparation) {
    this.foodPreparationService.remove(preparation.id).subscribe({
      next: () => {
        this.toastService.success('Eliminada', `"${preparation.name}" ha sido eliminada`);
        if (this.selectedPreparation()?.id === preparation.id) {
          this.selectedPreparation.set(null);
        }
        this.loadPreparations();
      },
      error: () => {
        this.toastService.error('Error', `No se pudo eliminar`);
      }
    });
  }

  // ─── Ingredient helpers ──────────────────────────────────────────────────────
  cancelForm() {
    if (this.isEditing) {
      this.isEditMode.set(false);
      this.resetForm();
    } else {
      this.closeDetail();
    }
  }

  resetForm() {
    this.newPreparationName.set('');
    this.preparationSteps.set('');
    this.selectedUtensils.set([]);
    this.selectedMachinery.set([]);
    this.editingId.set(null);
    this.ingredientRows.set([{ type: 'ingredient', selectedItem: null, amount: '', unit: 'g' }]);
  }

  addIngredientRow() {
    this.ingredientRows.update((rows) => [...rows, { type: 'ingredient', selectedItem: null, amount: '', unit: 'g' }]);
  }

  removeIngredientRow(index: number) {
    this.ingredientRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  getAvailableItems(type: 'ingredient' | 'elaboration'): any[] {
    return type === 'ingredient' ? this.availableProducts : this.allElaborations();
  }

  filterItems(event: any, type: 'ingredient' | 'elaboration') {
    const query = event.query.toLowerCase();
    let items = this.getAvailableItems(type);

    if (type === 'elaboration' && this.editingId()) {
      items = items.filter((item: any) => item.id !== this.editingId());
    }

    this.filteredItems = items.filter((item: any) => item.name.toLowerCase().includes(query));
  }

  // ─── Price ──────────────────────────────────────────────────────────────────
  getRowPrice(row: IngredientRow): number | null {
    const amount = parseFloat(row.amount);
    if (!row.selectedItem || !amount || amount <= 0) return null;

    // Sub-elaboration: use estimatedCost from the backend
    if (row.type === 'elaboration') {
      const elab = row.selectedItem as FoodPreparation;
      return elab?.estimatedCost ?? null;
    }

    // Ingredient: calculate from product prices
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

  // Sum of all priced rows in the current form
  totalFormCost = computed(() => {
    let total = 0;
    let hasAny = false;
    for (const row of this.ingredientRows()) {
      const price = this.getRowPrice(row);
      if (price != null) {
        total += price;
        hasAny = true;
      }
    }
    return hasAny ? total : null;
  });

  // ─── Save (CREATE or UPDATE) ─────────────────────────────────────────────────
  onSave() {
    if (!this.newPreparationName().trim()) {
      this.toastService.error('Campo requerido', `Debes ingresar un nombre`);
      return;
    }

    const filledRows = this.ingredientRows().filter((row) => row.selectedItem?.id && row.amount);

    const ingredients = filledRows
      .filter((row) => row.type === 'ingredient')
      .map((row) => ({
        enterpriseProductId: row.selectedItem.id as string,
        measure: row.unit,
        quantity: parseFloat(row.amount)
      }));

    const subPreparations = filledRows
      .filter((row) => row.type === 'elaboration')
      .map((row) => ({
        oldFoodPreparationId: row.selectedItem.id as string,
        measure: row.unit,
        quantity: parseFloat(row.amount)
      }));

    const utensilIds = this.selectedUtensils().map((u) => u.id);
    const machineryIds = this.selectedMachinery().map((m) => m.id);
    const steps = this.preparationSteps().trim() || undefined;
    const name = this.newPreparationName().trim();

    this.isSaving.set(true);

    // ── UPDATE ──
    if (this.isEditing) {
      const dto: UpdateFoodPreparationDto = {
        name,
        steps,
        ingredients: ingredients.length > 0 ? ingredients : [],
        subPreparations: subPreparations.length > 0 ? subPreparations : [],
        utensilIds,
        machineryIds
      };

      this.foodPreparationService.update(this.editingId()!, dto).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.toastService.success(`${this.typeLabel} actualizada`, `"${updated.name}" se ha guardado correctamente`);
          this.isEditMode.set(false);
          this.resetForm();
          this.loadPreparations();
          this.openDetail(updated);
        },
        error: () => {
          this.isSaving.set(false);
          this.toastService.error('Error', `No se pudo actualizar`);
        }
      });
      return;
    }

    // ── CREATE ──
    if (!this.preparationType()?.id) {
      this.isSaving.set(false);
      this.toastService.error('Error', `No se ha cargado el tipo`);
      return;
    }

    const createDto: CreateFoodPreparationDto = {
      typeId: this.preparationType()!.id,
      name,
      steps,
      ingredients: ingredients.length > 0 ? ingredients : undefined,
      subPreparations: subPreparations.length > 0 ? subPreparations : undefined,
      utensilIds,
      machineryIds
    };

    this.foodPreparationService.create(createDto).subscribe({
      next: (created) => {
        this.isSaving.set(false);
        this.toastService.success(`${this.typeLabel} creada`, `Se ha creado correctamente`);
        this.resetForm();
        this.isEditMode.set(false);
        this.loadPreparations();
        this.openDetail(created);
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Error', `No se pudo crear`);
      }
    });
  }
}
