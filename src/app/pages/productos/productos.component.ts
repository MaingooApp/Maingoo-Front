import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth-service.service';
import { InvoiceService, Product } from '../../core/services/invoice.service';
import { TablaDinamicaComponent } from '../../shared/components/tabla-dinamica/tabla-dinamica.component';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
    selector: 'app-productos',
    imports: [CommonModule, TableModule, InputTextModule, IconFieldModule, FormsModule, TablaDinamicaComponent],
    templateUrl: './productos.component.html',
    styleUrl: './productos.component.scss'
})
export class ProductosComponent implements OnInit {
    private invoiceService = inject(InvoiceService);
    private authService = inject(AuthService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);
    private router = inject(Router);

    productos: Product[] = [];
    filtroGlobal: string = '';
    cargando = false;

    columnas = [
        { field: 'name', header: 'Nombre', type: 'text', filter: true },
        { field: 'eanCode', header: 'EAN', type: 'text', filter: true },
        { field: 'category.name', header: 'Categoría', type: 'text', filter: true },
        { field: 'unit', header: 'Unidad', type: 'text', filter: true },
        { field: 'createdAt', header: 'Creado', type: 'date', filter: true }
    ] as const;
    acciones = [
        { icon: 'pi pi-eye', action: 'ver', color: 'secondary', tooltip: 'Ver detalle' },
        { icon: 'pi pi-trash', action: 'eliminar', color: 'danger', tooltip: 'Eliminar' }
    ] as const;

    handleAccion(event: { action: string; row: Product }) {
        if (event.action === 'ver') {
            this.verDetalleProducto(event.row);
            return;
        }

        if (event.action === 'eliminar') {
            this.confirmarEliminarProducto(event.row);
        }
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
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los productos. Intenta nuevamente.',
                    life: 4000
                });
            }
        });
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }

    convertToDecimal(value: any): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const sanitized = value.replace(',', '.');
            const parsed = parseFloat(sanitized);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    confirmarEliminarProducto(producto: Product) {
        // TODO: Reactivar cuando se implementen los métodos de productos en invoice.service.ts
        // Métodos necesarios: eliminarProductoInventario()

        this.messageService.add({
            severity: 'warn',
            summary: 'Funcionalidad no disponible',
            detail: 'Esta funcionalidad está temporalmente deshabilitada durante la migración.',
            life: 3000
        });

        /* 
        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas eliminar el producto "${producto.descripcion}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.invoiceService.eliminarProductoInventario(producto.id).subscribe({
                    next: () => {
                        this.productos = this.productos.filter((p) => p.id !== producto.id);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Eliminado',
                            detail: 'Producto eliminado correctamente',
                            life: 3000
                        });
                    },
                    error: (error: any) => {
                        console.error('Error al eliminar producto:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Hubo un problema al eliminar el producto',
                            life: 3000
                        });
                    }
                });
            }
        });
        */
    }

    private verDetalleProducto(producto: Product) {
        this.router.navigate(['/productos/detalle', producto.id]);
    }
}
