import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { InvoiceService } from '../invoices/services/invoice.service';
import { ProductService } from '../products/services/product.service';
import { ButtonModule } from 'primeng/button';
import { Invoice, Product, ProductGroup } from '@app/core/interfaces/Invoice.interfaces';
import { ModalService } from '@app/shared/services/modal.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AddArticleModalComponent } from './components/add-article-modal/add-article-modal.component';
import { TableModule } from 'primeng/table';
import { ToastService } from '../../shared/services/toast.service';

import { IconComponent } from '../../shared/components/icon/icon.component';

import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextarea } from 'primeng/inputtextarea';

interface IngredientRow {
  type: 'product' | 'elaboration';
  selectedItem: any;
  amount: string;
}

import { ArticlesCardComponent } from './components/articles-card/articles-card.component';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ButtonModule, TableModule, IconComponent, FormsModule, InputTextModule, DropdownModule, InputTextarea, ArticlesCardComponent],
  templateUrl: './articles.component.html',
})
export class ArticlesComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private productService = inject(ProductService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  private _dynamicDialogRef: DynamicDialogRef | null = null;

  hasInvoices = false;
  loading = true;

  // Local state for created articles (temporary)
  articles = signal<{ name: string }[]>([]);
  // Local state for created elaborations
  elaborations = signal<{ name: string; ingredients: IngredientRow[]; materials: string; steps: string }[]>([]);

  viewMode: 'list' | 'cards' = 'cards';

  // Add Article Form State
  showAddArticleForm = signal<boolean>(false);
  newArticleName = signal<string>('');
  newArticleType = signal<any>(null);

  // Add Elaboration Form State
  showAddElaborationForm = signal<boolean>(false);
  newElaborationName = signal<string>('');
  elaborationSteps = signal<string>('');
  elaborationMaterials = signal<string>('');

  // Ingredients State
  ingredientRows = signal<IngredientRow[]>([
    { type: 'product', selectedItem: null, amount: '' },
    { type: 'product', selectedItem: null, amount: '' },
    { type: 'product', selectedItem: null, amount: '' }
  ]);

  availableProducts = signal<Product[]>([]);

  ingredientTypes = [
    { label: 'Ingrediente', value: 'product' },
    { label: 'Elaboración', value: 'elaboration' }
  ];

  articleTypes = [
    { label: 'Aperitivo', value: 'aperitivo' },
    { label: 'Entrante', value: 'entrante' },
    { label: 'Principal', value: 'principal' },
    { label: 'Postre', value: 'postre' },
    { label: 'Bebida', value: 'bebida' }
  ];

  ngOnInit() {
    this.invoiceService.getInvoices().subscribe({
      next: (invoices: Invoice[]) => {
        this.hasInvoices = invoices.length > 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    // Load products for ingredients (flatten from groups)
    this.productService.getProducts().subscribe({
      next: (productGroups: ProductGroup[]) => {
        const allProducts = productGroups.flatMap(group => group.products);
        this.availableProducts.set(allProducts);
      }
    });
  }

  // State for expanded card view
  selectedCategory: string | null = null;

  selectCategory(category: string) {
    if (this.selectedCategory === category) {
      this.closeDetail();
      return;
    }
    this.selectedCategory = category;
    this.resetForms();
  }

  closeDetail() {
    this.selectedCategory = null;
    this.resetForms();
  }

  toggleAddArticleForm() {
    this.showAddArticleForm.update(v => !v);
  }

  toggleAddElaborationForm() {
    this.showAddElaborationForm.update(v => !v);
    if (!this.showAddElaborationForm()) {
      // If closing, maybe reset? Let's keep it simple for now and rely on manual reset or save.
    }
  }

  resetForms() {
    this.showAddArticleForm.set(false);
    this.newArticleName.set('');
    this.newArticleType.set(null);
    this.showAddElaborationForm.set(false);
    this.newElaborationName.set('');
    this.elaborationSteps.set('');
    this.elaborationMaterials.set('');
    this.showAddElaborationForm.set(false);
    this.newElaborationName.set('');
    // Reset ingredients to 3 empty rows
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

  saveElaboration() {
    if (!this.newElaborationName().trim()) return;

    this.elaborations.update(current => [
      ...current,
      {
        name: this.newElaborationName(),
        ingredients: [...this.ingredientRows()],
        materials: this.elaborationMaterials(),
        steps: this.elaborationSteps()
      }
    ]);

    this.toggleAddElaborationForm(); // Close form
    this.resetForms(); // Reset fields (although toggle calls reset if we want? No, toggle just flips boolean usually, let's check)
    // Actually toggle just flips boolean. We want to close and reset.
    // The previous toggle implementation just updated boolean.
    // resetForms sets showAddElaborationForm to false.
    // So just calling resetForms() is enough to close and clear.
  }

  removeIngredientRow(index: number) {
    this.ingredientRows.update(rows => rows.filter((_, i) => i !== index));
  }

  getAvailableItems(type: 'product' | 'elaboration'): any[] {
    if (type === 'product') {
      return this.availableProducts();
    }
    // For elaborations, we would filter articles by category 'elaborations'
    // For now assuming articles list contains them or we need to fetch them.
    // Since we don't have a separate elaborations list loaded yet, we'll use empty or filter articles if available.
    return this.articles().filter(a => true); // TODO: Filter actual elaborations when available
  }

  get categoryDisplayName(): string {
    if (!this.selectedCategory) return '';
    return this.selectedCategory === 'mise-en-place' ? 'Mise en place' : this.selectedCategory;
  }

  searchTerm = signal<string>('');

  onSearch(event: any) {
    this.searchTerm.set(event.target.value);
  }

  setViewMode(mode: string) {
    this.viewMode = mode as 'list' | 'cards';
  }
}
