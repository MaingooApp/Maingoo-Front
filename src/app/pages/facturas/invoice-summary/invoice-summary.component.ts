// invoice-summary.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ConvertNumbers } from '../../../core/helpers/numbers';
import { Invoice } from '../../../core/interfaces/Invoice.interfaces';
import { InvoiceService } from '../../../core/services/invoice-service.service';
import { TablaDinamicaComponent } from '../../../shared/components/tabla-dinamica/tabla-dinamica.component';


@Component({
  selector: 'app-invoice-summary',
  templateUrl: './invoice-summary.component.html',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TablaDinamicaComponent
  ],
})
export class InvoiceSummaryComponent implements OnInit {
  facturas: Invoice[] = [];
  loading = true;
  ConvertNumbers = ConvertNumbers;
  columnas = [
    { field: 'factura.numero', header: 'Número', type: 'text', filter: true },
    { field: 'proveedor.nombre', header: 'Proveedor', type: 'text', filter: true },
    { field: 'factura.fecha_emision', header: 'Fecha emisión', type: 'date', filter: true },
    { field: 'factura.total_con_iva', header: 'Total con IVA', type: 'numeric', filter: true }
  ]as const;
  
  acciones = [
    { icon: 'pi pi-pencil', action: 'editar', tooltip: 'Ver detalle', color: 'success' },
    { icon: 'pi pi-trash', action: 'eliminar', tooltip: 'Eliminar', color: 'danger' }
  ]as const;

  constructor(private invoiceService: InvoiceService, 
    private confirmationService: ConfirmationService, 
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.invoiceService.getFacturas().subscribe({
      next: (data) => {
        this.facturas = data;
        console.log('Facturas cargadas:', this.facturas);
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando facturas', err);
        this.loading = false;
      },
    });
  }

  verDetalle(factura: Invoice) {
    this.router.navigate(['/facturas/detalle', factura.id], {
      state: { factura }
    });  
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  confirmarEliminacion(factura: Invoice) {
    this.confirmationService.confirm({
      message: `¿Seguro que deseas eliminar la factura <b>${factura.factura.numero}</b>?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.eliminarFactura(factura);
        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'La factura ha sido eliminada.' });
      }
    });
  }
  

  eliminarFactura(factura: Invoice) {
    if (!factura.id) {
      console.warn('No se puede eliminar una factura sin ID.');
      return;
    }
  
    this.invoiceService.eliminarFactura(factura.id).then(() => {
      this.facturas = this.facturas.filter(f => f.id !== factura.id);
    }).catch(error => {
      console.error('Error eliminando la factura:', error);
    });
  }


handleAccion(event: { action: string; row: any }) {
  if (event.action === 'editar') {
    this.verDetalle(event.row);
  } else if (event.action === 'eliminar') {
    this.confirmarEliminacion(event.row);
  }
}
}
