import { Component, inject, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AddInvoiceModalComponent } from '../invoices/components/add-invoice-modal/add-invoice-modal.component';
import { LayoutService } from '../../layout/service/layout.service';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SidebarShellComponent } from '../../shared/components/sidebar-shell/sidebar-shell.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { ToastService } from '../../shared/services/toast.service';
import { SupplierService } from './services/supplier.service';
import { Supplier, UpdateSupplierDto } from './interfaces/supplier.interface';
import { InvoiceService } from '../invoices/services/invoice.service';
import { Invoice } from '../../core/interfaces/Invoice.interfaces';
import { ModalService } from '../../shared/services/modal.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { SupplierDetailComponent } from './components/supplier-detail/supplier-detail.component';

import { SupplierCardComponent } from './components/supplier-card/supplier-card.component';
import { SupplierListComponent } from './components/supplier-list/supplier-list.component';

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
    InputSwitchModule,
    InputNumberModule,
    MultiSelectModule,
    SelectButtonModule,
    DropdownModule,
    FormsModule,
    ChartModule,
    TagModule,
    TooltipModule,
    TooltipModule,
    SectionHeaderComponent,
    EmptyStateComponent,
    IconComponent,
    SkeletonComponent,
    SupplierDetailComponent,
    SupplierCardComponent,
    SupplierListComponent
  ],
  templateUrl: './supplier.component.html'
})
export class SupplierComponent implements OnDestroy {
  @ViewChild(SupplierDetailComponent) detailComponent!: SupplierDetailComponent;

  private supplierService = inject(SupplierService);
  private invoiceService = inject(InvoiceService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private layoutService = inject(LayoutService);
  private _dynamicDialogRef: DynamicDialogRef | null = null;

  // --- State & Data Definitions ---
  // Data
  supplier: Supplier[] = [];
  filteredSupplier: Supplier[] = [];
  supplierInvoices: Invoice[] = [];
  selectedSupplier: Supplier | null = null;
  cargando = true;

  // UI State
  showMobileSearch = false; // New state for mobile search toggle
  viewMode: 'grid' | 'list' = 'grid';
  viewOptions: any[] = [
    { icon: 'grid_view', value: 'grid' },
    { icon: 'view_list', value: 'list' }
  ];

  get isMobile(): boolean {
    return window.innerWidth < 768;
  }

  // --- UI Handlers & Interactivity ---

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
    this.hideDialog();
  }

  openAddInvoiceModal() {
    this._dynamicDialogRef = this.modalService.open(AddInvoiceModalComponent, {
      width: '960px',
      header: 'Agregar documento',
      dismissableMask: false
    });
  }

  viewInvoice(invoice: Invoice) {
    if (invoice.id) {
      this.router.navigate(['/facturas/detalle', invoice.id]);
    }
  }

  columns = [
    { field: 'name', header: 'Nombre', type: 'text', filter: true },
    { field: 'cifNif', header: 'NIF/CIF', type: 'text', filter: true },
    { field: 'address', header: 'Dirección', type: 'text', filter: true },
    { field: 'phoneNumber', header: 'Teléfono', type: 'text', filter: true },
    { field: 'commercialName', header: 'Nombre Comercial', type: 'text', filter: true }
  ] as const;

  actions = [
    { action: 'delete', icon: 'delete', color: 'danger', tooltip: 'Eliminar proveedor' }
  ] as const;

  constructor(
    private confirmDialog: ConfirmDialogService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.layoutService.setPageTitle('Proveedores'); // Set title for mobile topbar
    this.cargando = true;

    this.supplierService.listSuppliers().subscribe({
      next: (suppliers: Supplier[]) => {
        this.supplier = suppliers;
        this.filteredSupplier = suppliers;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar proveedores:', error);
        this.cargando = false;
      }
    });
  }

  ngOnDestroy() {
    this.layoutService.setPageTitle(''); // Clear title when leaving
  }

  // --- Helpers & Utilities ---

  confirmarEliminarProveedor(prov: Supplier) {
    this.confirmDialog.confirmDeletion(`¿Estás seguro de eliminar al proveedor "${prov.name}"?`, {
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      onAccept: () => {
        this.eliminarProveedor(prov.id!);
      }
    });
  }

  // Wrappers for Template calls
  confirmDelete(supplier: Supplier) {
    this.confirmarEliminarProveedor(supplier);
  }

  saveSupplier(supplier: Supplier) {
    const dto: UpdateSupplierDto = {
      name: supplier.name,
      cifNif: supplier.cifNif,
      address: supplier.address || null,
      phoneNumber: supplier.phoneNumber || null,
      commercialName: supplier.commercialName || null,
      commercialEmail: supplier.commercialEmail || null,
      commercialPhoneNumber: supplier.commercialPhoneNumber || null,
      orderDays: supplier.orderDays || null,
      deliveryDays: supplier.deliveryDays || null,
      minPriceDelivery:
        supplier.minPriceDelivery !== null && supplier.minPriceDelivery !== undefined
          ? Number(supplier.minPriceDelivery)
          : null,
      sanitaryRegistrationNumber: supplier.sanitaryRegistrationNumber || null
    };

    this.supplierService.updateSupplier(supplier.id!, dto).subscribe({
      next: (updated) => {
        this.toastService.success('Proveedor actualizado', 'Los datos se han guardado correctamente.');
        // Update local data
        Object.assign(supplier, updated);

        if (this.detailComponent) {
          this.detailComponent.onSaveSuccess();
        }
      },
      error: (err) => {
        console.error('Error updating supplier:', err);
        this.toastService.error('Error', 'No se pudieron guardar los cambios.');
      }
    });
  }

  // --- Data Fetching & Operations ---

  eliminarProveedor(id: string) {
    this.supplierService.deleteSupplier(id).subscribe({
      next: () => {
        this.supplier = this.supplier.filter((s) => s.id !== id);
        this.filteredSupplier = [...this.supplier];
        this.toastService.success('Proveedor eliminado', 'El proveedor ha sido eliminado correctamente.');
        this.selectedSupplier = null; // Close details
      },
      error: (err) => {
        console.error('Error deleting supplier:', err);
        this.toastService.error('Error', 'No se pudo eliminar el proveedor.');
      }
    });
  }

  showDialog(supplier: Supplier) {
    // If clicking the same supplier, deselect (collapse) it
    if (this.selectedSupplier && this.selectedSupplier.id === supplier.id) {
      this.selectedSupplier = null;
      this.supplierInvoices = [];
      return;
    }

    this.selectedSupplier = { ...supplier };
    this.loadInvoices(supplier.id!);
  }

  hideDialog() {
    this.selectedSupplier = null;
    this.supplierInvoices = [];
  }

  loadInvoices(supplierId: string) {
    this.supplierInvoices = []; // Reset before loading
    this.invoiceService.getInvoices().subscribe((invoices: Invoice[]) => {
      this.supplierInvoices = invoices.filter((inv) => inv.supplierId === supplierId);
    });
  }

  filterSuppliers(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredSupplier = this.supplier.filter(
      (s) =>
        s.name?.toLowerCase().includes(query) ||
        s.commercialName?.toLowerCase().includes(query) ||
        s.cifNif?.toLowerCase().includes(query)
    );
  }

  handleAccionProveedor({ action, row }: { action: string; row: any }) {
    if (action === 'eliminar') {
      this.confirmarEliminarProveedor(row);
    }
  }

  onTableSelection(event: any) {
    if (event.data) {
      this.showDialog(event.data);
    }
  }
}

