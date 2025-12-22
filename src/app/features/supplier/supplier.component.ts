import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
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
    InputSwitchModule,
    MultiSelectModule,
    SelectButtonModule,
    DropdownModule,
    FormsModule,
    ChartModule,
    TagModule
  ],
  templateUrl: './supplier.component.html'
})
export class SupplierComponent {
  private supplierService = inject(SupplierService);
  private invoiceService = inject(InvoiceService);
  private router = inject(Router);

  // Data
  supplier: Supplier[] = [];
  filteredSupplier: Supplier[] = [];
  supplierInvoices: Invoice[] = [];
  selectedSupplier: Supplier | null = null;
  cargando = true;
  
  // UI State
  showInvoices = false;
  showStats = false;
  showMenu = false;
  viewMode: 'grid' | 'list' = 'grid';
  viewOptions: any[] = [
      { icon: 'pi pi-th-large', value: 'grid' },
      { icon: 'pi pi-list', value: 'list' }
  ];

  viewInvoice(invoice: Invoice) {
    if (invoice.id) {
        this.router.navigate(['/facturas/detalle', invoice.id]);
    }
  }
  
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

  // Chart
  chartData: any;
  historyChartData: any;
  chartOptions: any;

  async ngOnInit() {
    this.cargando = true;
    this.initChartOptions();
    
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

  // Wrappers for Template calls
  confirmDelete(supplier: Supplier) {
    this.confirmarEliminarProveedor(supplier);
  }

  editSupplier(supplier: Supplier) {
    this.toastService.info('Próximamente', 'La edición de proveedores estará disponible pronto.');
  }

  eliminarProveedor(id: string) {
    this.supplierService.deleteSupplier(id).subscribe({
      next: () => {
        this.supplier = this.supplier.filter((p) => p.id !== id);
        this.filteredSupplier = this.filteredSupplier.filter((p) => p.id !== id);
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

  filterSuppliers(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredSupplier = this.supplier.filter(s => 
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

  showDialog(supplier: Supplier) {
    // If clicking the same supplier, deselect (collapse) it
    if (this.selectedSupplier && this.selectedSupplier.id === supplier.id) {
        this.selectedSupplier = null;
        this.showInvoices = false; // Reset other states
        this.showMenu = false;
        return;
    }
    
    this.selectedSupplier = supplier;
    // Reset states
    this.supplierInvoices = [];
    this.showInvoices = false;
    this.showMenu = false;
    
    // Init toggles based on data existence
    this.showDelivery = !!(supplier.deliveryDays || supplier.minPriceDelivery);
    this.showMinOrder = !!supplier.minPriceDelivery;
    
    // Parse delivery days
    this.selectedDays = supplier.deliveryDays ? supplier.deliveryDays.split(',').map((d: string) => d.trim()) : [];
    
    // Logic for contact: check if phone exists. 'Email' and 'Contact Person' are not in interface yet, so check phone.
    this.showContact = !!supplier.phoneNumber;

    // Fetch invoices for this supplier
    if (supplier.id) {
       this.invoiceService.getInvoices({supplierId: supplier.id}).subscribe({
          next: (invoices: Invoice[]) => {
            this.supplierInvoices = invoices;
            this.updateChartData(this.supplierInvoices);
          },
          error: (err: any) => console.error('Error cargando facturas', err)
       });
    }
  }

  initChartOptions() {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1A3C34',
          titleColor: '#fff',
          bodyColor: '#fff',
          cornerRadius: 4,
          displayColors: false,
          callbacks: {
            label: function(context: any) {
               return context.parsed.y + ' €';
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
             display: false,
             drawBorder: false
          },
          ticks: {
             color: '#6b7280', // gray-500
             font: { size: 10 }
          }
        },
        y: {
          display: false, // minimalist: hide y axis
          grid: {
            display: false,
            drawBorder: false
          }
        }
      }
    };
  }

  // Chart Data
  availableYears: {label: string, value: number}[] = [];
  selectedYear: number = new Date().getFullYear();

  updateChartData(invoices: Invoice[]) {
    // 0. Calculate Available Years
    const currentYear = new Date().getFullYear();
    
    if (invoices.length > 0) {
        const invoiceYears = invoices.map(inv => new Date(inv.date).getFullYear());
        const minYear = Math.min(...invoiceYears);
        
        // Generate continuous range from minYear to currentYear
        this.availableYears = [];
        for (let year = currentYear; year >= minYear; year--) {
             this.availableYears.push({ label: year.toString(), value: year });
        }
        
        // If selectedYear is not in availableYears (not possible by logic unless < minYear, but safer to check)
        const yearExists = this.availableYears.some(y => y.value === this.selectedYear);
        if (!yearExists) {
             this.selectedYear = currentYear;
        }
    } else {
        this.availableYears = [{ label: currentYear.toString(), value: currentYear }];
        this.selectedYear = currentYear;
    }

    // 1. Update Monthly Chart for Selected Year
    this.updateMonthlyChart();

    // 2. Historical Data (Yearly)
    if (invoices.length > 0) {
        const years = invoices.map(inv => new Date(inv.date).getFullYear());
        const minYear = Math.min(...years);
        const maxYear = new Date().getFullYear(); 
        
        const yearlyLabels: string[] = [];
        const yearlyTotals: number[] = [];

        for (let year = minYear; year <= maxYear; year++) {
            yearlyLabels.push(year.toString());
            const total = invoices
                .filter(inv => new Date(inv.date).getFullYear() === year)
                .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
            yearlyTotals.push(total);
        }

        this.historyChartData = {
            labels: yearlyLabels,
            datasets: [
                {
                    label: 'Gasto Anual',
                    data: yearlyTotals,
                    backgroundColor: '#1A3C34', // maingoo-deep
                    hoverBackgroundColor: '#6B9E86', // maingoo-sage
                    borderRadius: 4,
                    barThickness: 20
                }
            ]
        };
    }
  }

  updateMonthlyChart() {
    const monthlyTotals = new Array(12).fill(0);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    this.supplierInvoices.forEach(inv => {
      const date = new Date(inv.date);
      if (date.getFullYear() === Number(this.selectedYear)) {
        monthlyTotals[date.getMonth()] += Number(inv.amount || 0);
      }
    });

    this.chartData = {
      labels: months,
      datasets: [
        {
          label: 'Gasto',
          data: monthlyTotals,
          backgroundColor: '#6B9E86', // maingoo-sage
          hoverBackgroundColor: '#1A3C34', // maingoo-deep
          borderRadius: 4,
          barThickness: 12
        }
      ]
    };
  }

  onYearChange() {
    this.updateMonthlyChart();
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
