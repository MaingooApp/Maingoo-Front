import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TablaDinamicaComponent } from '../../shared/components/tabla-dinamica/tabla-dinamica.component';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { ToastService } from '../../shared/services/toast.service';
import { SupplierService } from './services/supplier.service';
import { Supplier } from './interfaces/supplier.interface';

import { InvoiceService } from '../invoices/services/invoice.service';
import { Invoice } from '../../core/interfaces/Invoice.interfaces';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    InputIconModule,
    ButtonModule,
    TablaDinamicaComponent,
    InputSwitchModule,
    MultiSelectModule,
    FormsModule
  ],
  templateUrl: './supplier.component.html'
})
export class SupplierComponent {
  private supplierService = inject(SupplierService);
  private invoiceService = inject(InvoiceService);

  supplier: Supplier[] = [];
  supplierInvoices: Invoice[] = [];
  cargando = false;
  
  // UI State
  selectedSupplier: Supplier | null = null;
  showInvoices = false;
  showMenu = false;
  
  // Toggle Sections
  showContact = false;
  showDelivery = false;
  showMinOrder = false;
  
  // Delivery Days
  selectedDays: string[] = [];
  selectedLastOrderDays: string[] = [];
  daysOptions = [
    { label: 'Lunes', value: 'Lunes', short: 'Lun' },
    { label: 'Martes', value: 'Martes', short: 'Mar' },
    { label: 'Miércoles', value: 'Miércoles', short: 'Mié' },
    { label: 'Jueves', value: 'Jueves', short: 'Jue' },
    { label: 'Viernes', value: 'Viernes', short: 'Vie' },
    { label: 'Sábado', value: 'Sábado', short: 'Sáb' },
    { label: 'Domingo', value: 'Domingo', short: 'Dom' }
  ];

  columns = [
    { field: 'name', header: 'Nombre', type: 'text', filter: true },
    { field: 'cifNif', header: 'NIF/CIF', type: 'text', filter: true },
    { field: 'address', header: 'Dirección', type: 'text', filter: true },
    { field: 'phoneNumber', header: 'Teléfono', type: 'text', filter: true },
    { field: 'commercialName', header: 'Nombre Comercial', type: 'text', filter: true }
  ] as const;

  actions = [
    {
      icon: 'pi pi-trash',
      action: 'eliminar',
      color: 'danger',
      tooltip: 'Eliminar'
    }
  ] as const;

  constructor(
    private confirmDialog: ConfirmDialogService,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    this.cargando = true;
    this.supplierService.listSuppliers().subscribe({
      next: (suppliers: Supplier[]) => {
        this.supplier = suppliers;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar proveedores:', error);
        this.cargando = false;
      }
    });
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  confirmarEliminarProveedor(prov: Supplier) {
    this.confirmDialog.confirmDeletion(`¿Estás seguro de eliminar al proveedor "${prov.name}"?`, {
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      onAccept: () => {
        this.eliminarProveedor(prov.id!);
      }
    });
  }

  eliminarProveedor(id: string) {
    this.supplierService.deleteSupplier(id).subscribe({
      next: () => {
        this.supplier = this.supplier.filter((p) => p.id !== id);
        this.toastService.success('Proveedor eliminado');
        if (this.selectedSupplier?.id === id) {
          this.hideDialog();
        }
      },
      error: (err) => {
        console.error(err);
        this.toastService.error('Error al eliminar', err.error.message || 'Intenta nuevamente más tarde.');
      }
    });
  }

  handleAccionProveedor({ action, row }: { action: string; row: any }) {
    if (action === 'eliminar') {
      this.confirmarEliminarProveedor(row);
    }
  }

  showDialog(item: Supplier) {
    this.selectedSupplier = item;
    // Reset states
    this.supplierInvoices = [];
    this.showInvoices = false;
    this.showMenu = false;
    
    // Init toggles based on data existence
    this.showDelivery = !!(item.deliveryDays || item.minPriceDelivery);
    this.showMinOrder = !!item.minPriceDelivery;
    
    // Parse delivery days
    this.selectedDays = item.deliveryDays ? item.deliveryDays.split(',').map(d => d.trim()) : [];
    
    // Logic for contact: check if phone exists. 'Email' and 'Contact Person' are not in interface yet, so check phone.
    this.showContact = !!item.phoneNumber;

    // Fetch invoices for this supplier
    if (item.id) {
       this.invoiceService.getInvoices().subscribe({
          next: (invoices: Invoice[]) => {
            this.supplierInvoices = invoices.filter((inv: Invoice) => inv.supplierId === item.id);
          },
          error: (err: any) => console.error('Error cargando facturas', err)
       });
    }
  }

  hideDialog() {
    this.selectedSupplier = null;
    this.supplierInvoices = [];
    this.showMenu = false;
    this.showContact = false;
    this.showDelivery = false;
    this.showMinOrder = false;
    this.selectedDays = [];
    this.selectedLastOrderDays = [];
  }

  toggleDay(type: 'delivery' | 'lastOrder', day: string) {
    const targetArray = type === 'delivery' ? this.selectedDays : this.selectedLastOrderDays;
    const index = targetArray.indexOf(day);
    
    if (index === -1) {
      targetArray.push(day);
    } else {
      targetArray.splice(index, 1);
    }
  }

  isDaySelected(type: 'delivery' | 'lastOrder', day: string): boolean {
    const targetArray = type === 'delivery' ? this.selectedDays : this.selectedLastOrderDays;
    return targetArray.includes(day);
  }

  toggleMenu(event?: Event) {
    if(event) event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  downloadSupplier() {
    if (!this.selectedSupplier) return;
    const dataStr = JSON.stringify(this.selectedSupplier, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proveedor_${this.selectedSupplier.name.replace(/\s+/g, '_')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showMenu = false;
  }
}
