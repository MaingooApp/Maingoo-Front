import { CommonModule, NgClass } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Invoice, Product } from '@app/core/interfaces/Invoice.interfaces';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { InvoiceService } from '../../../invoices/services/invoice.service';
import { InventoryHistoryComponent } from '../../components/inventory-history/inventory-history.component';
import { ProductDetailSidebarComponent } from '../../components/product-detail-sidebar/product-detail-sidebar.component';
import { ConfirmDialogService } from '@app/shared/services/confirm-dialog.service';
import { SupplierService } from '@app/features/supplier/services/supplier.service';

export interface InventoryItem extends Product {
  idealStock: number | null;
  manualInventory: number | null;
}

export interface InventoryRecord {
  id: string;
  date: Date;
  itemsCount: number;
  items: InventoryItem[];
  categoryNames: string[];
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule, 
    ButtonModule, 
    InputTextModule, 
    FormsModule, 
    DialogModule, 
    ToastModule, 
    ConfirmDialogModule, 
    TagModule, 
    NgClass, 
    ChartModule, 
    SkeletonModule,
    TooltipModule,
    TooltipModule,
    DropdownModule,
    MultiSelectModule,
    ProductDetailSidebarComponent,
    InventoryHistoryComponent
  ],
  providers: [],
  templateUrl: './productos.component.html',

})
export class ProductosComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private supplierService = inject(SupplierService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmDialogService);

  priceChartData: any;
  priceChartOptions: any;
  
  @ViewChild('dt') dt!: Table;

  productos: Product[] = [];
  inventoryItems: InventoryItem[] = []; // Local inventory state
  filtroGlobal: string = '';
  cargando = false;
  selectedProduct: Product | null = null;
  showMenu = false;
  
  // View State
  viewMode: 'list' | 'cards' | 'inventory' | 'history' = 'list';
  savedInventories: InventoryRecord[] = [];
  selectedCategory: string | null = null;
  selectedInventoryCategory: string[] = [];
  selectedInventoryRecord: InventoryRecord | null = null;
  currentDate = new Date();

  get uniqueCategories(): { name: string, count: number }[] {
    const categoryCounts = new Map<string, number>();
    
    this.productos.forEach(p => {
        if (p.category?.name) {
            categoryCounts.set(p.category.name, (categoryCounts.get(p.category.name) || 0) + 1);
        }
    });

    return Array.from(categoryCounts.entries()).map(([name, count]) => ({
        name,
        count
    }));
  }
  
  get inventoryCategoryOptions() {
      return this.uniqueCategories.map(c => ({ label: c.name, value: c.name }));
  }

  get filteredInventoryItems(): InventoryItem[] {
      if (!this.selectedInventoryCategory || this.selectedInventoryCategory.length === 0) {
          return this.inventoryItems;
      }
      return this.inventoryItems.filter(item => item.category?.name && this.selectedInventoryCategory.includes(item.category.name));
  }

  get categoryProducts(): Product[] {
    if (!this.selectedCategory) return [];
    return this.productos.filter(p => p.category?.name === this.selectedCategory);
  }

  setViewMode(mode: 'list' | 'cards' | 'inventory' | 'history') {
    this.viewMode = mode;
    if (mode === 'list') {
        this.selectedCategory = null;
    } else if (mode === 'cards') {
        this.selectedProduct = null;
    }
  }

  elaborarInventario() {
    this.selectedInventoryRecord = null;
    this.currentDate = new Date();
    this.inventoryItems = this.productos.map(p => ({
        ...p,
        idealStock: null,
        manualInventory: null
    }));
    this.selectedInventoryCategory = []; // Reset selection
    this.setViewMode('inventory');
    this.hideDialog();
  }

  guardarInventario() {
      // Use the filtered items logic to ensure we only save what is selected
      const itemsToSave = this.filteredInventoryItems;
      
      const newRecord: InventoryRecord = {
          id: crypto.randomUUID(),
          date: new Date(),
          itemsCount: itemsToSave.length,
          items: [...itemsToSave], // Copy filtered state
          categoryNames: this.selectedInventoryCategory
      };
      
      this.savedInventories.unshift(newRecord); // Add to beginning
      this.toastService.success('Inventario Guardado', 'Se ha generado correctamente la ficha de inventario.');
      this.setViewMode('history');
  }

  verHistorialInventarios() {
      this.setViewMode('history');
  }

  verDetalleInventario(record: InventoryRecord) {
      this.selectedInventoryRecord = record;
      this.inventoryItems = [...record.items];
      this.currentDate = record.date;
      // Stay in 'history' view to show master-detail layout
  }

  cancelarEdicionInventario() {
      if (this.selectedInventoryRecord) {
          this.selectedInventoryRecord = null; // Just close sidebar
      } else {
          this.setViewMode('list');
      }
  }

  cerrarDetalleInventario() {
      this.selectedInventoryRecord = null;
  }

  eliminarInventario(record: InventoryRecord) {
      this.confirmationService.confirm({
          message: '¿Estás seguro de que quieres eliminar este histórico de inventario?',
          header: 'Confirmar eliminación',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí, eliminar',
          rejectLabel: 'Cancelar',
          acceptButtonStyleClass: 'p-button-danger',
          rejectButtonStyleClass: 'p-button-secondary p-button-text',
          onAccept: () => {
              this.savedInventories = this.savedInventories.filter(r => r !== record);
              this.selectedInventoryRecord = null;
              this.toastService.success('Inventario eliminado', 'El registro ha sido eliminado correctamente.');
          }
      });
  }

  getFormattedCategoryNames(names: string[] | undefined | null): string {
      if (!names || names.length === 0) return 'todos los productos';
      if (names.length === 1) return names[0];
      const last = names[names.length - 1];
      const others = names.slice(0, -1).join(', ');
      return `${others} y ${last}`;
  }

  selectCategory(categoryName: string) {
    this.selectedProduct = null; // Close product detail if open
    this.selectedCategory = categoryName;
  }

  closeCategoryDetail() {
    this.selectedCategory = null;
  }

  async ngOnInit(): Promise<void> {
    this.cargando = true;

    this.invoiceService.getProducts().subscribe({
      next: (productos: Product[]) => {
        this.productos = productos;
        this.cargando = false;
        console.log('Productos cargados:', this.productos);
      },
      error: (error: any) => {
        console.error('Error al cargar productos:', error);
        this.cargando = false;
        this.toastService.error('Error', 'No se pudieron cargar los productos. Intenta nuevamente.', 4000);
      }
    });
  }

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
  
  eliminarTodo() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar TODOS los productos? Esta acción no se puede deshacer.',
      header: 'Confirmar eliminación masiva',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar todo',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      onAccept: () => {
        if (this.productos.length === 0) return;
        
        this.cargando = true;
        const deleteObservables = this.productos.map(p => this.invoiceService.deleteProduct(p.id));
        
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
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  showDialog(product: Product) {
    if (this.selectedProduct?.id === product.id) {
       this.hideDialog();
    } else {
       this.selectedProduct = product;
       this.invoiceService.getInvoices({productId: product.id}).subscribe({
        next: (invoices: Invoice[]) => {
            this.invoices = invoices;
            console.log('Facturas cargadas:', this.invoices);
            this.updatePriceChart(product);
        },
        error: (error: any) => {
            console.error('Error al cargar facturas:', error);
            this.toastService.error('Error', 'No se pudieron cargar las facturas.');
        }
       })
    }
  }

  private updatePriceChart(product: Product) {

    const labels: string[] = [];
    const prices: number[] = [];
    
    this.supplierService.getPriceHistory(product.id).subscribe({
      next: (priceHistory: any) => {
        console.log('Historial de precios:', priceHistory);
        priceHistory.reverse().forEach((price: any) => {
          labels.push(new Date(price.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }));
          prices.push(price.price);
        });
      },
      error: (error: any) => {
        this.toastService.error('Error', 'No se pudieron cargar los precios.');
      }
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
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
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

  getCategoryStyle(category: string | undefined): { [klass: string]: any } {
    if (!category) return {};

    switch (category.toLowerCase()) {
      case 'frutas':
      case 'verduras':
        // Green
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'carnes':
        // Red
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      case 'lacteos':
        // Blue
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'bebidas':
        // Yellow/Orange
        return { backgroundColor: '#fef9c3', color: '#854d0e' };
      case 'limpieza':
        // Purple
        return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
      default:
        // Gray
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  }

  filterProductos(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dt.filterGlobal(value, 'contains');
  }
}
