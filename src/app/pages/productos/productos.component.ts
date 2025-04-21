import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AuthService } from '../../core/services/auth-service.service';
import { InvoiceService } from '../../core/services/invoice-service.service';
import { TablaDinamicaComponent } from '../../shared/components/tabla-dinamica/tabla-dinamica.component';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-productos',
  imports: [CommonModule, TableModule, InputTextModule, IconFieldModule, FormsModule, TablaDinamicaComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss'
})
export class ProductosComponent {
  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  productos: any[] = [];
  filtroGlobal: string = '';
  cargando = false;
  seleccionados: any[] = [];

  columnas = [
    { field: 'descripcion', header: 'Descripción', type: 'text', filter: true },
    { field: 'precio', header: 'Precio', type: 'numeric', filter: true },
    { field: 'proveedorNombre', header: 'Proveedor', type: 'text', filter: true },
    { field: 'categoria', header: 'Categoría', type: 'text', filter: true },
    { field: 'alergenos', header: 'Alérgenos', type: 'text', filter: true }
  ] as const;
  acciones = [
    { icon: 'pi pi-trash', action: 'eliminar', color: 'danger', tooltip: 'Eliminar' }
  ] as const;

  async handleAccion(event: { action: string; row: any }) {
    this.confirmarEliminarProducto(event.row);
  }

  async ngOnInit(): Promise<void> {
    this.cargando = true;

    const negocioId = await this.authService.getNegocioId();
    if (!negocioId) {
      console.error('No se encontró el ID del negocio.');
      this.cargando = false;
      return;
    }
    this.invoiceService
      .getProductosInventario(negocioId)
      .subscribe((productos) => {
        this.productos = productos;
        this.cargando = false;
        console.log(this.productos);
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

  confirmarEliminarProducto(producto: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar el producto "${producto.descripcion}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.invoiceService.eliminarProductoInventario(producto.id);
          this.productos = this.productos.filter(p => p.id !== producto.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Eliminado',
            detail: 'Producto eliminado correctamente',
            life: 3000
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Hubo un problema al eliminar el producto',
            life: 3000
          });
        }
      }
    });
  }

}
