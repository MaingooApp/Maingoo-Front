import { CommonModule, NgClass } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Invoice, Product, ProductGroup } from '@app/core/interfaces/Invoice.interfaces';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { SkeletonModule } from 'primeng/skeleton';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { InvoiceService } from '../../../invoices/services/invoice.service';

import { ProductDetailSidebarComponent } from '../../components/product-detail-sidebar/product-detail-sidebar.component';
import { ConfirmDialogService } from '@app/shared/services/confirm-dialog.service';

import { SupplierService } from '@app/features/supplier/services/supplier.service';
import { ModalService } from '@app/shared/services/modal.service';
import { AddInvoiceModalComponent } from '../../../invoices/components/add-invoice-modal/add-invoice-modal.component';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { LayoutService } from '@app/layout/service/layout.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { getCategoryStyle as getCategoryColor } from '@app/shared/helpers/category-colors.helper';

import { ProductListComponent } from '../../components/product-list/product-list.component';
import { ProductCategoryCardComponent } from '../../components/product-category-card/product-category-card.component';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    MultiSelectModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    SkeletonModule,
    ChartModule,
    SectionHeaderComponent,
    EmptyStateComponent,
    ProductDetailSidebarComponent,
    IconComponent,
    SkeletonComponent,
    ProductListComponent,
    ProductCategoryCardComponent
  ],
  providers: [],
  templateUrl: './productos.component.html'
})
export class ProductosComponent implements OnInit, OnDestroy {
  public layoutService = inject(LayoutService);
  private invoiceService = inject(InvoiceService);
  private supplierService = inject(SupplierService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmDialogService);
  private modalService = inject(ModalService);
  private _dynamicDialogRef: DynamicDialogRef | null = null;

  // --- State & Data Definitions ---

  priceChartData: any;
  priceChartOptions: any;

  @ViewChild('dt') dt!: Table;

  productos: Product[] = [];
  productGroups: ProductGroup[] = []; // Groups by rootCategory from API

  filtroGlobal: string = '';
  cargando = false;
  selectedProduct: Product | null = null;
  showMenu = false;
  showMobileSearch = false; // New state for mobile search toggle
  searchTerm: string = '';

  // View State
  viewMode: 'list' | 'cards' = 'cards';
  selectedCategory: string | null = null;

  get isMobile(): boolean {
    return window.innerWidth < 768;
  }

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

  get currentCategoryIndex(): number {
    if (!this.selectedCategory) return -1;
    return this.uniqueCategories.findIndex((c) => c.name === this.selectedCategory);
  }

  nextCategory() {
    const currentIndex = this.currentCategoryIndex;
    if (currentIndex !== -1 && currentIndex < this.uniqueCategories.length - 1) {
      this.selectCategory(this.uniqueCategories[currentIndex + 1].name);
    }
  }

  prevCategory() {
    const currentIndex = this.currentCategoryIndex;
    if (currentIndex > 0) {
      this.selectCategory(this.uniqueCategories[currentIndex - 1].name);
    }
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
        (p.eanCode && p.eanCode.includes(lowerTerm))
      );
    });
  }

  get categoryProducts(): Product[] {
    if (!this.selectedCategory) return [];
    // Find the group with the matching root category name
    const group = this.productGroups.find(g => g.rootCategory.name === this.selectedCategory);
    if (!group) return [];

    // Apply search filter if any
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

  setViewMode(mode: 'list' | 'cards') {
    this.viewMode = mode;
    this.selectedCategory = null;
    this.selectedProduct = null;
  }

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

  // --- Swipe Handling ---
  private touchStartX = 0;
  private touchStartY = 0;

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].screenX;
    const touchEndY = event.changedTouches[0].screenY;
    this.handleSwipeGesture(touchEndX, touchEndY);
  }

  private handleSwipeGesture(touchEndX: number, touchEndY: number) {
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    // Minimum swipe distance threshold (e.g., 50px)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe Left -> Next Category
        this.nextCategory();
      } else {
        // Swipe Right -> Prev Category
        this.prevCategory();
      }
    }
  }

  // --- Initialization & Lifecycle ---

  async ngOnInit(): Promise<void> {
    this.layoutService.setPageTitle('Mi almacén');
    this.cargando = true;

    this.invoiceService.getProducts().subscribe({
      next: (productGroups: ProductGroup[]) => {
        // Store groups for category cards display
        this.productGroups = productGroups;

        // Flatten all products from all groups
        const allProducts: Product[] = productGroups.flatMap(group => group.products);

        // Map potential snake_case from backend and parse string numbers
        this.productos = allProducts.map((p) => {
          let count = (p as any).unit_count ?? p.unitCount;

          if (typeof count === 'string') {
            count = parseFloat(count.replace(',', '.'));
          }

          return {
            ...p,
            unitCount: count
          };
        });
        this.cargando = false;
        console.log('Grupos de productos cargados:', this.productGroups);
        console.log('Productos aplanados:', this.productos);
      },
      error: (error: any) => {
        console.error('Error al cargar productos:', error);
        this.cargando = false;
        this.toastService.error('Error', 'No se pudieron cargar los productos. Intenta nuevamente.', 4000);
      }
    });
  }

  ngOnDestroy() {
    this.layoutService.setPageTitle('');
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
        const deleteObservables = this.productos.map((p) => this.invoiceService.deleteProduct(p.id));

        forkJoin(deleteObservables).subscribe({
          next: () => {
            this.productos = [];
            this.cargando = false;
            this.toastService.success('Inventario vaciado', 'Todos los productos han sido eliminados correctamente.');
          },
          error: (err: any) => {
            console.error('Error al eliminar productos:', err);
            this.cargando = false;
            this.toastService.error('Error', 'No se pudieron eliminar todos los productos.');
            // Recargar productos para reflejar el estado real (algunos pueden haberse borrado)
            this.ngOnInit();
          }
        });
      }
    });
  }

  // New Implementation for Invoice Logic
  invoices: Invoice[] = [];

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  showDialog(product: Product) {
    if (this.selectedProduct?.id === product.id) {
      this.hideDialog();
    } else {
      this.selectedProduct = product;
      this.invoiceService.getInvoices({ productId: product.id }).subscribe({
        next: (invoices: Invoice[]) => {
          this.invoices = invoices;
          console.log('Facturas cargadas:', this.invoices);
          this.updatePriceChart(product);
        },
        error: (error: any) => {
          console.error('Error al cargar facturas:', error);
          this.toastService.error('Error', 'No se pudieron cargar las facturas.');
        }
      });
    }
  }

  private async updatePriceChart(product: Product) {
    const labels: string[] = [];
    const prices: number[] = [];

    const result = await firstValueFrom(this.supplierService.getPriceHistory(product.id));
    result.reverse().forEach((price: any) => {
      labels.push(
        new Date(price.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      );
      prices.push(price.price);
    });

    this.priceChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Precio Unitario',
          data: prices,
          fill: true,
          borderColor: '#6366f1', // maingoo-indigo equivalent
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#6366f1',
          pointHoverBackgroundColor: '#6366f1',
          pointHoverBorderColor: '#ffffff'
        }
      ]
    };

    this.priceChartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function (context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                  context.parsed.y
                );
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          }
        },
        y: {
          display: true,
          beginAtZero: false,
          grid: {
            color: '#f3f4f6'
          }
        }
      }
    };
  }

  hideDialog() {
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

  getCategoryStyle(category: string | undefined | null): { [klass: string]: any } {
    return getCategoryColor(category);
  }

  filterProductos(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm = value;

    if (this.dt) {
      this.dt.filterGlobal(value, 'contains');
    }
  }
}
