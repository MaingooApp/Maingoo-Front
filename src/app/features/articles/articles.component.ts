import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  TemplateRef,
  signal,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { InvoiceService } from '../invoices/services/invoice.service';
import { ProductService } from '../products/services/product.service';
import { ButtonModule } from 'primeng/button';
import { Invoice, Product, ProductGroup } from '@app/core/interfaces/Invoice.interfaces';
import { TableModule } from 'primeng/table';
import { ToastService } from '../../shared/services/toast.service';

import { IconComponent } from '../../shared/components/icon/icon.component';

import { ArticlesCardComponent } from './components/articles-card/articles-card.component';
import { ArticlesDetailComponent } from './components/articles-detail/articles-detail.component';
import { ArticlesSectionHeaderDetailComponent } from './components/articles-section-header-detail/articles-section-header-detail.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

interface ArticleSummary {
  name: string;
}

type ArticleViewMode = 'list' | 'cards';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    IconComponent,
    ArticlesCardComponent,
    ArticlesDetailComponent,
    ArticlesSectionHeaderDetailComponent,
    NgxPermissionsModule
  ],
  templateUrl: './articles.component.html',
  host: {
    class: 'block h-full min-h-0'
  }
})
export class ArticlesComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly P = AppPermission;
  private invoiceService = inject(InvoiceService);
  private productService = inject(ProductService);
  private toastService = inject(ToastService);
  private headerService = inject(SectionHeaderService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('headerTpl') headerTpl!: TemplateRef<unknown>;
  @ViewChild('articlesDetailComponent') articlesDetailComponent?: ArticlesDetailComponent;

  hasInvoices = false;
  loading = true;

  // Local state for created articles (temporary)
  articles = signal<ArticleSummary[]>([]);

  viewMode: ArticleViewMode = 'cards';

  availableProducts = signal<Product[]>([]);

  ngOnInit() {
    this.invoiceService
      .getInvoices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoices: Invoice[]) => {
          this.hasInvoices = invoices.length > 0;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });

    // Load products for ingredients (flatten from groups)
    this.productService
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (productGroups: ProductGroup[]) => {
          const allProducts = productGroups.flatMap((group) => group.products);
          this.availableProducts.set(allProducts);
        },
        error: () => {
          this.toastService.error('Error', 'No se pudieron cargar los productos disponibles.');
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
    return this.selectedCategory === 'equipment' ? 'Máquinas y utensilios' : this.selectedCategory;
  }

  searchTerm = signal<string>('');

  onSearch(event: Event) {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    this.searchTerm.set(input?.value ?? '');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy() {
    this.headerService.reset();
  }

  setViewMode(mode: ArticleViewMode) {
    this.viewMode = mode;
  }

  onAddPreparation() {
    this.articlesDetailComponent?.onAddPreparation();
  }
}
