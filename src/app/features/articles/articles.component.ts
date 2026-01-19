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
import { ArticlesDetailComponent } from './components/articles-detail/articles-detail.component';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ButtonModule, TableModule, IconComponent, FormsModule, InputTextModule, DropdownModule, ArticlesCardComponent, ArticlesDetailComponent],
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

  viewMode: 'list' | 'cards' = 'cards';

  availableProducts = signal<Product[]>([]);

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
  }

  closeDetail() {
    this.selectedCategory = null;
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
