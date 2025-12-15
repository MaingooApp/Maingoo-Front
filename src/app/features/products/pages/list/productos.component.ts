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

@Component({
  selector: 'app-productos',
  imports: [CommonModule, TableModule, InputTextModule, IconFieldModule, FormsModule, TooltipModule, ButtonModule, ConfirmDialogModule, TagModule],
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

  verDetalleProducto(producto: Product) {
    this.showDialog(producto);
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  showDialog(product: Product) {
    if (this.selectedProduct?.id === product.id) {
       this.hideDialog();
    } else {
       this.selectedProduct = product;
       this.findRelatedInvoices(product);
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
            const productWords = normalizedProductName.split(' ').filter((w: string) => w.length > 2);
            if (productWords.length === 0) return lineDesc.includes(normalizedProductName);
            
            return productWords.every((word: string) => lineDesc.includes(word));
        });
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
