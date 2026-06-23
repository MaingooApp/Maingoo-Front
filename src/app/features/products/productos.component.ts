import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, OnDestroy, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Invoice, Product, ProductGroup } from '@app/core/interfaces/Invoice.interfaces';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { ProductService } from './services/product.service';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { ConfirmDialogService } from '@app/shared/services/confirm-dialog.service';
import { ModalService } from '@app/shared/services/modal.service';
import { AddInvoiceModalComponent } from '../invoices/components/add-invoice-modal/add-invoice-modal.component';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { SectionNavigationService } from '@app/layout/service/section-navigation.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { getCategoryStyle as getCategoryColor } from '@app/shared/helpers/category-colors.helper';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { CategoryDetailComponent } from './components/category-detail/category-detail.component';
import { DetailCardShellComponent } from '@shared/components/detail-card-shell/detail-card-shell.component';
import { ProductsSectionHeaderDetailComponent } from './components/products-section-header-detail/products-section-header-detail.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '../../core/constants/permissions.enum';

type CategoryStyle = Record<string, string>;
type ProductWithLegacyUnitCount = Product & {
  unit_count?: number | string | null;
  stock: number | string;
};

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    SkeletonModule,
    EmptyStateComponent,
    ProductDetailComponent,
    IconComponent,
    SkeletonComponent,
    ProductCardComponent,
    DetailCardShellComponent,
    CategoryDetailComponent,
    ProductsSectionHeaderDetailComponent,
    NgxPermissionsModule
  ],
  providers: [],
  templateUrl: './productos.component.html',
  host: {
    class: 'block h-full min-h-0'
  }
})
export class ProductosComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly P = AppPermission;
  private headerService = inject(SectionHeaderService);
  private sectionNavigationService = inject(SectionNavigationService);
  private productService = inject(ProductService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmDialogService);
  private modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private _dynamicDialogRef: DynamicDialogRef | null = null;

  // --- State & Data Definitions ---

  @ViewChild('headerTpl') headerTpl!: TemplateRef<unknown>;

  productos: Product[] = [];
  productGroups: ProductGroup[] = []; // Groups by rootCategory from API

  filtroGlobal: string = '';
  cargando = false;
  selectedProduct: Product | null = null;
  showMenu = false;
  searchTerm: string = '';

  // View State
  selectedCategory: string | null = null;

  get uniqueCategories(): { name: string; count: number }[] {
    const categoryCounts = new Map<string, number>();

    // Use filtered products instead of all products
    this.filteredProducts.forEach((p) => {
      // Compatibility with new backend: usage of p.category instead of p.subcategory
      const cat = p.category || p.subcategory;
      const categoryName = cat?.name;
      if (categoryName) {
        categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
      }
    });

    return Array.from(categoryCounts.entries())
      .map(([name, count]) => ({
        name,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }

  get filteredProducts(): Product[] {
    if (!this.searchTerm) return this.productos;
    const lowerTerm = this.normalizeText(this.searchTerm);
    return this.productos.filter((p) => {
      const cat = p.category || p.subcategory;
      const categoryName = cat?.name;
      // category.parent?.name used to be categories before? The JSON structure implies simpler hierarchy now?
      // New JSON: "category": { "name": "Frutas frescas", "parent": { "name": "Frutas" } }
      // The search logic might want to search parent too.
      // Keeping it simple to category name for now unless subcategory name meant parent before.

      const subcategoryName = cat?.name; // In new JSON, category IS the specific category.

      return (
        this.normalizeText(p.name).includes(lowerTerm) ||
        (categoryName && this.normalizeText(categoryName).includes(lowerTerm)) ||
        (p.category?.path && this.normalizeText(p.category.path).includes(lowerTerm)) ||
        (p.eanCode && p.eanCode.includes(lowerTerm))
      );
    });
  }

  get filteredProductGroups(): ProductGroup[] {
    if (!this.searchTerm) return this.productGroups;
    const lowerTerm = this.normalizeText(this.searchTerm);

    return this.productGroups
      .map((group) => {
        // Filter products within the group
        const matchingProducts = group.products.filter((p) => {
          const categoryName = p.category?.name;
          return (
            this.normalizeText(p.name).includes(lowerTerm) ||
            (categoryName && this.normalizeText(categoryName).includes(lowerTerm)) ||
            (p.category?.path && this.normalizeText(p.category.path).includes(lowerTerm)) ||
            (p.eanCode && p.eanCode.includes(lowerTerm))
          );
        });

        // Check if group matches
        const groupNameMatches = this.normalizeText(group.rootCategory.name).includes(lowerTerm);

        // Return group if name matches OR has matching products
        // If name matches, show all? Or just matches? Usually just matches is better context,
        // but if category name matches, maybe user wants to see all in that category?
        // Let's stick to showing the group if it has content relevant to search.

        // If we want to show the count of MATCHING products in the card, we'd need to return a modified group.
        // For now, let's just filter the list of groups.

        if (groupNameMatches || matchingProducts.length > 0) {
          return {
            ...group,
            products: matchingProducts.length > 0 ? matchingProducts : group.products, // If group matches but no products, maybe show all?
            productCount: matchingProducts.length > 0 ? matchingProducts.length : group.products.length // Update count to reflect matches?
          };
        }
        return null;
      })
      .filter((group) => group !== null) as ProductGroup[];
  }

  get categoryProducts(): Product[] {
    if (!this.selectedCategory) return [];
    // Find the group with the matching root category name
    const group = this.productGroups.find((g) => g.rootCategory.name === this.selectedCategory);
    if (!group) return [];

    // Apply the active search filter.
    if (!this.searchTerm) return group.products;
    const lowerTerm = this.normalizeText(this.searchTerm);
    return group.products.filter((p) => {
      return (
        this.normalizeText(p.name).includes(lowerTerm) ||
        (p.category?.name && this.normalizeText(p.category.name).includes(lowerTerm)) ||
        (p.category?.path && this.normalizeText(p.category.path).includes(lowerTerm)) ||
        (p.eanCode && p.eanCode.includes(lowerTerm))
      );
    });
  }

  // --- UI Handlers & Interactivity ---

  elaborarInventario() {
    /* this.toastService.info('Funcionalidad deshabilitada', 'La elaboración de inventario no está disponible.'); */
  }

  verHistorialInventarios() {
    /* this.toastService.info('Funcionalidad deshabilitada', 'El historial de inventarios no está disponible.'); */
  }

  selectCategory(categoryName: string) {
    this.selectedProduct = null; // Close product detail if open
    this.selectedCategory = categoryName;
  }

  closeCategoryDetail() {
    this.selectedCategory = null;
  }

  openAddInvoiceModal() {
    this._dynamicDialogRef = this.modalService.open(AddInvoiceModalComponent, {
      width: '960px',
      header: 'Agregar documento',
      dismissableMask: false
    });
  }

  // --- Initialization & Lifecycle ---

  ngAfterViewInit() {
    // Register the header template with the global shell (with timeout to avoid ExpressionChangedAfterItHasBeenCheckedError)
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  async ngOnInit(): Promise<void> {
    this.cargando = true;

    this.sectionNavigationService.homeRequest$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((route) => {
      if (route === '/productos') {
        this.resetToMainView();
      }
    });

    this.productService
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (productGroups: ProductGroup[]) => {
          this.productGroups = productGroups.map((group) => ({
            ...group,
            products: group.products.map((p) => this.normalizeProductData(p))
          }));

          this.productos = this.productGroups.flatMap((group) => group.products);
          this.cargando = false;
        },
        error: () => {
          this.cargando = false;
          this.toastService.error('Error', 'No se pudieron cargar los productos. Intenta nuevamente.', 4000);
        }
      });
  }

  ngOnDestroy() {
    this.headerService.reset();
  }

  // --- Helpers & Utilities ---

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  confirmarEliminarProducto(producto: Product) {
    this.toastService.warn(
      'Funcionalidad no disponible',
      'Esta funcionalidad está temporalmente deshabilitada durante la migración.',
      3000
    );
  }

  // --- Data Fetching & Operations ---

  eliminarTodo() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar TODOS los productos? Esta acción no se puede deshacer.',
      header: 'Confirmar eliminación masiva',
      icon: 'warning',
      acceptLabel: 'Eliminar todo',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      onAccept: () => {
        if (this.productos.length === 0) return;

        this.cargando = true;
        const deleteObservables = this.productos.map((p) => this.productService.deleteProduct(p.id));

        forkJoin(deleteObservables)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.productos = [];
              this.cargando = false;
              this.toastService.success('Inventario vaciado', 'Todos los productos han sido eliminados correctamente.');
            },
            error: () => {
              this.cargando = false;
              this.toastService.error('Error', 'No se pudieron eliminar todos los productos.');
              this.ngOnInit();
            }
          });
      }
    });
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizeProductData(p: Product): Product {
    const product = p as ProductWithLegacyUnitCount;
    let count = product.unit_count ?? product.unitCount;
    let stock = p.stock;

    if (typeof count === 'string') {
      count = parseFloat((count as string).replace(',', '.'));
    }

    if (typeof stock === 'string') {
      stock = parseFloat((stock as string).replace(',', '.'));
    }

    return {
      ...p,
      unitCount: count,
      stock: stock
    };
  }

  /**
   * Toggles product detail panel. Invoice/chart loading is now handled by ProductDetailComponent.
   */
  showDialog(product: Product) {
    if (this.selectedProduct?.id === product.id) {
      this.hideDialog();
    } else {
      this.selectedProduct = product;
    }
  }

  hideDialog() {
    this.selectedProduct = null;
    this.showMenu = false;
  }

  private resetToMainView(): void {
    this.selectedCategory = null;
    this.selectedProduct = null;
    this.showMenu = false;
  }

  verFactura(invoice: Invoice) {
    this.router.navigate(['/facturas/detalle', invoice.id]);
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  getCategoryStyle(category: string | undefined | null): CategoryStyle {
    return getCategoryColor(category);
  }

  filterProductos(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm = value;
  }
}
