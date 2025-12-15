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

  verDetalleProducto(producto: Product) {
    this.showDialog(producto);
  }

  invoices: Invoice[] = [];
  invoicesLoaded = false;
  relatedInvoices: Invoice[] = [];

  showDialog(product: Product) {
    if (this.selectedProduct?.id === product.id) {
      this.hideDialog();
    } else {
      this.selectedProduct = product;
      this.findRelatedInvoices(product);
    }
  }

  hideDialog() {
    this.selectedProduct = null;
    this.relatedInvoices = [];
    this.showMenu = false;
  }

  private findRelatedInvoices(product: Product) {
    this.relatedInvoices = [];
    
    if (this.invoicesLoaded) {
      this.filterInvoices(product);
    } else {
      this.invoiceService.getInvoices().subscribe({
        next: (invoices) => {
          this.invoices = invoices;
          this.invoicesLoaded = true;
          this.filterInvoices(product);
        },
        error: (err) => console.error('Error loading invoices', err)
      });
    }
  }

  private filterInvoices(product: Product) {
    console.log('Filtering invoices for product:', product.name, product.id);
    console.log('Total invoices available:', this.invoices.length);

    this.relatedInvoices = this.invoices.filter(invoice => {
      const match = invoice.invoiceLines.some(line => {
        // Debug individual line matching if needed
        // console.log('Checking line:', line.description, line.suppliersProductId);
        return (line.suppliersProductId && line.suppliersProductId === product.id) ||
               (line.description && line.description.toLowerCase().includes(product.name.toLowerCase()));
      });
      return match;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    console.log('Found related invoices:', this.relatedInvoices.length);
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
