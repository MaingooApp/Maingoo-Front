import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AuthService } from '../../core/services/auth-service.service';
import { InvoiceService } from '../../core/services/invoice-service.service';
import { TablaDinamicaComponent } from '../../shared/components/tabla-dinamica/tabla-dinamica.component';

@Component({
  selector: 'app-productos',
  imports: [CommonModule, TableModule, InputTextModule, IconFieldModule, FormsModule, TablaDinamicaComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss'
})
export class ProductosComponent {
  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);

  productos: any[] = [];
  filtroGlobal: string = '';
  cargando = false;
  seleccionados: any[] = [];

  columnas = [
    { field: 'referencia', header: 'Referencia', type: 'text', filter: true },
    { field: 'descripcion', header: 'Descripción', type: 'text', filter: true },
    { field: 'cantidad', header: 'Cantidad', type: 'numeric', filter: true },
    { field: 'precio', header: 'Precio', type: 'numeric', filter: true },
    { field: 'proveedorNombre', header: 'Proveedor', type: 'text', filter: true },
    { field: 'fechaFactura', header: 'Fecha', type: 'date', filter: true },
  ] as const;
  acciones = [
    { icon: 'pi pi-trash', action: 'eliminar', color: 'danger', tooltip: 'Eliminar' }
  ] as const;

handleAccion(event: { action: string; row: any }) {
  console.log('Acción recibida:', event);
  // Aquí puedes hacer lógica condicional
}

  ngOnInit(): void {
    this.cargando = true;

    this.authService.getNegocioId().then((negocioId) => {
      if (!negocioId) return;

      this.invoiceService
        .getProductosInventario(negocioId)
        .subscribe((productos) => {
          this.productos = productos;
          this.cargando = false;
          console.log(this.cargando);
          
        });
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
}
