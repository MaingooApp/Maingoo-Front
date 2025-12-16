import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth-service.service';
import { Product, Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { InvoiceService } from '../../../invoices/services/invoice.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-productos',
  imports: [CommonModule, TableModule, InputTextModule, IconFieldModule, FormsModule, TooltipModule, ButtonModule, ConfirmDialogModule, TagModule, SkeletonModule, ChartModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss',
  providers: [ConfirmationService]
})
export class ProductosComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  
  @ViewChild('dt') dt!: Table;

  productos: Product[] = [];
  filtroGlobal: string = '';
  cargando = false;
  selectedProduct: Product | null = null;
  showMenu = false;
  
  // View State
  viewMode: 'list' | 'cards' = 'list';
  selectedCategory: string | null = null;

  get uniqueCategories(): { name: string, count: number }[] {
    const categoryMap = new Map<string, number>();
    
    this.productos.forEach(p => {
        if (p.category?.name) {
            const count = categoryMap.get(p.category.name) || 0;
            categoryMap.set(p.category.name, count + 1);
        }
    });

    return Array.from(categoryMap.entries()).map(([name, count]) => ({
        name,
        count
    })).sort((a, b) => b.count - a.count); // Sort by count descending
  }

  get categoryProducts(): Product[] {
    if (!this.selectedCategory) return [];
    return this.productos.filter(p => p.category?.name === this.selectedCategory);
  }

  setViewMode(mode: 'list' | 'cards') {
    this.viewMode = mode;
    if (mode === 'list') {
        this.selectedCategory = null;
    } else {
        this.selectedProduct = null;
    }
  }

  elaborarInventario() {
    // TODO: Implement inventory logic
    console.log('Elaborar inventario clicked');
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
        this.loadInvoiceData(); // Load stats after products
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
      accept: () => {
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
  relatedInvoices: Invoice[] = [];
  loadingInvoices = false;
  
  // Cache for product statistics (Price & Supplier)
  productStats: Map<string, { lastPrice: number, supplierName: string, date: Date }> = new Map();
  loadingStats = false;

  verDetalleProducto(producto: Product) {
    this.selectedProduct = producto;
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  
  private loadInvoiceData() {
    this.loadingStats = true;
    this.invoiceService.getInvoices().subscribe({
        next: (summaryInvoices) => {
            if (summaryInvoices.length === 0) {
                this.loadingStats = false;
                return;
            }

            const detailObservables = summaryInvoices.map(inv => this.invoiceService.getInvoiceById(inv.id));
            
            forkJoin(detailObservables).subscribe({
                next: (detailedInvoices) => {
                    this.invoices = detailedInvoices; // Store for valid related invoices usage later
                    this.processProductStats(detailedInvoices);
                    this.loadingStats = false;
                },
                error: (err) => {
                    console.error('Error loading invoice stats:', err);
                    this.loadingStats = false;
                }
            });
        },
        error: (err) => {
             console.error('Error fetching invoices list for stats:', err);
             this.loadingStats = false;
        }
    });
  }

  private processProductStats(invoices: Invoice[]) {
    // Sort invoices by date descending (newest first)
    const sortedInvoices = [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedInvoices.forEach(invoice => {
        if (!invoice.invoiceLines) return;

        invoice.invoiceLines.forEach(line => {
            // We need to match this line to a product in our list
            // 1. Try ID Match
            let productId = line.suppliersProductId; // This might be the Product ID or EAN or arbitrary string
            
            // We need to find the REAL product ID in our this.productos list that matches this line
            // This is the reverse of filterInvoices logic.
            // Since we have this.productos loaded, we can look it up.
            
            // Optimization: Create a lookup map for products if this is slow, but for now loop is fine for N < 1000
            const product = this.findProductForLine(line, this.productos);
            
             if (product) {
                // If we haven't found a newer entry for this product, store it.
                // Since we traverse newest invoices first, the first time we see a product, it's the latest.
                if (!this.productStats.has(product.id)) {
                    // Use unitPrice if available, fall back to price (total) / quantity or just price
                    let finalPrice = 0;
                    if (line.unitPrice) {
                         finalPrice = typeof line.unitPrice === 'number' ? line.unitPrice : parseFloat(String(line.unitPrice).replace(',','.') || '0');
                    } else if (line.price) {
                         finalPrice = typeof line.price === 'number' ? line.price : parseFloat(String(line.price).replace(',','.') || '0');
                    }

                    this.productStats.set(product.id, {
                        lastPrice: finalPrice,
                        supplierName: invoice.supplier?.name || 'Desconocido',
                        date: new Date(invoice.date)
                    });
                }
            }
        });
    });
  }

  private findProductForLine(line: any, products: Product[]): Product | undefined {
      // 1. Direct ID match
      const pById = products.find(p => p.id === line.suppliersProductId);
      if (pById) return pById;
      
      // 2. EAN match (if suppliersProductId holds EAN)
      const pByEan = products.find(p => p.eanCode && p.eanCode === line.suppliersProductId);
      if (pByEan) return pByEan;
      
      // 3. Name match
      if (!line.description) return undefined;
      const lineDesc = this.normalizeText(line.description);
      
      return products.find(p => {
          const pName = this.normalizeText(p.name);
          return lineDesc.includes(pName); // Simplified for performance here
      });
  }

  showDialog(product: Product) {
    if (this.selectedProduct?.id === product.id) {
       this.hideDialog();
    } else {
       this.selectedProduct = product;
       // We can reuse the already loaded invoices if available, or filter again
       if (this.invoices.length > 0) {
           this.filterInvoices(this.invoices, product);
       } else {
           this.findRelatedInvoices(product); // Fallback if stats haven't loaded
       }
    }
  }

  private findRelatedInvoices(product: Product) {
    this.relatedInvoices = [];
    this.loadingInvoices = true;
    
    // 1. Get List of Invoices (Summary)
    this.invoiceService.getInvoices().subscribe({
        next: (summaryInvoices) => {
            if (summaryInvoices.length === 0) {
                this.loadingInvoices = false;
                return;
            }

            // 2. Fetch Details for ALL invoices to get the lines
            // Optimization: In a real large-scale app, this should be paginated or done via a dedicated backend endpoint search.
            const detailObservables = summaryInvoices.map(inv => this.invoiceService.getInvoiceById(inv.id));
            
            forkJoin(detailObservables).subscribe({
                next: (detailedInvoices) => {
                    this.loadingInvoices = false;
                    this.filterInvoices(detailedInvoices, product);
                },
                error: (err) => {
                    console.error('Error fetching invoice details:', err);
                    this.loadingInvoices = false;
                    this.toastService.error('Error', 'No se pudieron cargar los detalles de las facturas.');
                }
            });
        },
        error: (err) => {
            console.error('Error fetching invoices list:', err);
            this.loadingInvoices = false;
        }
    });
  }

  private filterInvoices(invoices: Invoice[], product: Product) {
    const normalizedProductName = this.normalizeText(product.name);

    this.relatedInvoices = invoices.filter(invoice => {
        if (!invoice.invoiceLines || !Array.isArray(invoice.invoiceLines)) return false;

        return invoice.invoiceLines.some(line => {
            // 1. Strong Match: ID or EAN
            if (line.suppliersProductId === product.id) return true;
            if (product.eanCode && line.suppliersProductId === product.eanCode) return true;

            // 2. Text Match
            if (!line.description) return false;
            const lineDesc = this.normalizeText(line.description);
            
            // Inclusion
            if (lineDesc.includes(normalizedProductName)) return true;

            // Fuzzy Word Match
            // Explicit type annotation to fix TS implicit any error
            const productWords = normalizedProductName.split(' ').filter((w: string) => w.length > 2);
            if (productWords.length === 0) return lineDesc.includes(normalizedProductName);
            
            // Explicit type annotation to fix TS implicit any error
            return productWords.every((word: string) => lineDesc.includes(word));
        });
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Update chart after filtering
    this.updatePriceChart(this.relatedInvoices, product);
  }

  // Chart Data
  priceChartData: any;
  priceChartOptions: any;

  private updatePriceChart(invoices: Invoice[], product: Product) {
    if (!invoices.length) {
        this.priceChartData = null;
        return;
    }

    // Sort ascending for the chart (Time ->)
    const sortedForChart = [...invoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const normalizedProductName = this.normalizeText(product.name);

    const labels: string[] = [];
    const prices: number[] = [];

    sortedForChart.forEach(inv => {
        if (!inv.invoiceLines) return;
        
        // Find the specific line for this product to get the price
        const line = inv.invoiceLines.find(l => {
             // Reuse matching logic (simplified)
             if (l.suppliersProductId === product.id) return true;
             if (product.eanCode && l.suppliersProductId === product.eanCode) return true;
             if (!l.description) return false;
             
             const lineDesc = this.normalizeText(l.description);
             if (lineDesc.includes(normalizedProductName)) return true;
             
             const productWords = normalizedProductName.split(' ').filter((w: string) => w.length > 2);
             if (productWords.length === 0) return false;
             return productWords.every((word: string) => lineDesc.includes(word));
        });

        if (line) {
             labels.push(new Date(inv.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));
             // Ensure price is a number and use unitPrice if available
             let priceVal = 0;
             if (line.unitPrice) {
                 priceVal = typeof line.unitPrice === 'number' ? line.unitPrice : parseFloat(String(line.unitPrice).replace(',','.') || '0');
             } else if (line.price) {
                 priceVal = typeof line.price === 'number' ? line.price : parseFloat(String(line.price).replace(',','.') || '0');
             }
             
             prices.push(priceVal);
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
