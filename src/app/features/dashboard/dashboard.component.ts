import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KpiSlotComponent } from './components/kpi-slot/kpi-slot.component';
import { DashboardKpiSlotMockService } from './services/dashboard-kpi-slot.mock.service';
import { KpiSlotVM, KpiSlotClickEvent, KpiSlideChangeEvent } from './interfaces/kpi-slot.interfaces';
import { Observable, startWith, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { InvoiceService } from '../invoices/services/invoice.service';
import { SupplierService } from '../supplier/services/supplier.service';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastService } from '@app/shared/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Componente principal del Dashboard
 * Muestra KPI slots y cards de métricas del restaurante
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, KpiSlotComponent, ChartModule, DropdownModule, SkeletonModule, IconComponent, SkeletonComponent],
  templateUrl: './dashboard.component.html'
})
export class Dashboard implements OnInit {
  private kpiSlotService = inject(DashboardKpiSlotMockService);
  private invoiceService = inject(InvoiceService);
  private supplierService = inject(SupplierService);
  private platformId = inject(PLATFORM_ID);
  private cd = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  /** Observable del slot de Actividad con estado loading inicial */
  actividadSlot$!: Observable<KpiSlotVM>;

  /** Observable del slot de Incidencias con estado loading inicial */
  incidenciasSlot$!: Observable<KpiSlotVM>;

  /** Observable del slot de Acciones con estado loading inicial */
  actionsSlot$!: Observable<KpiSlotVM>;

  /** Datos del pie chart de proveedores */
  supplierChartData: any;
  supplierChartOptions: any;
  supplierChartLoading = true;
  supplierChartTotal = 0;


  /** Período fijo para el gráfico de proveedores (siempre semana actual) */
  private readonly supplierPeriod = 'week';

  /** Almacén de todas las facturas para filtrar localmente */
  private allInvoices: Invoice[] = [];



  /** Panel lateral activo: null = cerrado, 'suppliers' | 'products' | 'articles' | 'sales' | 'staff' */
  activePanel: 'suppliers' | 'products' | 'articles' | 'sales' | 'staff' | 'gestoria' | 'appcc' | 'docs' | null = null;

  /** Lista resumen de proveedores para el panel */
  supplierSummary: { name: string; total: number; color: string }[] = [];

  /** Bar chart de gasto mensual por proveedor */
  monthlyExpenseChartData: any;
  monthlyExpenseChartOptions: any;
  monthlyExpenseChartLoading = false;

  /** Opciones de año para el selector del bar chart */
  yearOptions: { label: string; value: number }[] = [];
  selectedYear: number = new Date().getFullYear();

  /** Opciones de proveedor para el selector del bar chart */
  supplierOptions: { label: string; value: string }[] = [];
  selectedSupplierId: string = 'all';

  /** Datos fake de personal para el dashboard */
  staffSchedule = [
    { name: 'María García', role: 'Camarero/a', shift: '10:00 - 18:00' },
    { name: 'Carlos Ruiz', role: 'Cocinero/a', shift: '08:00 - 16:00' },
    { name: 'Ana Martínez', role: 'Encargado/a', shift: '09:00 - 17:00' },
    { name: 'Luis Fernández', role: 'Ayudante cocina', shift: '12:00 - 20:00' },
    { name: 'Elena López', role: 'Camarero/a', shift: '16:00 - 00:00' },
  ];

  /** Datos fake de tareas APPCC para el dashboard */
  appccTasks = {
    diarias: [
      { task: 'Registrar temperatura cámaras', done: true },
      { task: 'Control de aceite freidora', done: true },
      { task: 'Limpieza de plancha', done: false },
      { task: 'Limpieza de superficies', done: false },
      { task: 'Verificar fechas de caducidad', done: false },
    ],
    semanales: [
      { task: 'Limpieza profunda de horno', done: false },
      { task: 'Limpieza de cámaras frigoríficas', done: false },
      { task: 'Revisión de stock de productos', done: true },
    ],
    mensuales: [
      { task: 'Calibración de termómetros', done: false },
      { task: 'Revisión de extintores', done: false },
    ]
  };

  /** Contador de tareas APPCC completadas */
  get completedAppccTasks(): number {
    return [
      ...this.appccTasks.diarias,
      ...this.appccTasks.semanales,
      ...this.appccTasks.mensuales
    ].filter(t => t.done).length;
  }

  /** Total de tareas APPCC */
  get totalAppccTasks(): number {
    return this.appccTasks.diarias.length +
      this.appccTasks.semanales.length +
      this.appccTasks.mensuales.length;
  }

  /** Datos de ventas para la card */
  salesData = {
    current: {
      day: '',
      time: '',
      amount: 0
    },
    lastWeek: {
      amount: 0,
      diff: 0 // Diferencia porcentual
    },
    average: {
      amount: 0
    }
  };

  /** Actualiza los datos de ventas (Fake) */
  updateSalesData(): void {
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    this.salesData.current.day = days[now.getDay()];
    this.salesData.current.time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Fake data logic
    this.salesData.current.amount = 1250.50;
    this.salesData.lastWeek.amount = 1100.20;
    this.salesData.average.amount = 1150.00; // Media histórica

    // Calcular diferencia porcentual del día actual vs semana pasada
    const diff = ((this.salesData.current.amount - this.salesData.lastWeek.amount) / this.salesData.lastWeek.amount) * 100;
    this.salesData.lastWeek.diff = Math.round(diff);
  }




  /** Colores para el gráfico */
  private readonly CHART_COLORS = [
    '#6B9080',  // maingoo-sage
    '#F59E0B',  // amber-500
    '#3B82F6',  // blue-500
    '#8B5CF6',  // violet-500
    '#EC4899',  // pink-500
    '#10B981',  // emerald-500
    '#F97316',  // orange-500
    '#9CA3AF'   // gray-400 (para "Otros")
  ];

  /** Slot inicial en estado loading para Actividad */
  private readonly loadingSlotActividad: KpiSlotVM = {
    id: 'actividad',
    title: 'Actividad',
    slides: [],
    loading: true
  };

  /** Slot inicial en estado loading para Incidencias */
  private readonly loadingSlotIncidencias: KpiSlotVM = {
    id: 'incidencias',
    title: 'Incidencias',
    slides: [],
    loading: true
  };

  /** Slot inicial en estado loading para Acciones */
  private readonly loadingSlotActions: KpiSlotVM = {
    id: 'acciones',
    title: 'Acciones',
    slides: [],
    loading: true
  };

  ngOnInit(): void {
    this.loadActividadSlot();
    this.loadIncidenciasSlot();
    this.loadActionsSlot();
    this.loadSupplierChart();

    this.updateSalesData();
  }

  /**
   * Carga el slot de Actividad con estado loading inicial
   */
  loadActividadSlot(): void {
    this.actividadSlot$ = this.kpiSlotService.getActividadSlot$().pipe(
      startWith(this.loadingSlotActividad)
    );
  }

  /**
   * Carga el slot de Incidencias con estado loading inicial
   */
  loadIncidenciasSlot(): void {
    this.incidenciasSlot$ = this.kpiSlotService.getIncidenciasSlot$().pipe(
      startWith(this.loadingSlotIncidencias)
    );
  }

  /**
   * Carga el slot de Acciones Requeridas (Proveedores)
   */
  loadActionsSlot(): void {
    this.actionsSlot$ = this.supplierService.listSuppliers().pipe(
      map(suppliers => {
        const missingSanitaryReg = suppliers.filter(s => !s.sanitaryRegistrationNumber).length;

        const slot: KpiSlotVM = {
          id: 'acciones',
          title: 'Acciones',
          slides: []
        };

        if (missingSanitaryReg > 0) {
          slot.slides.push({
            id: 'missing-sanitary-reg',
            label: 'Proveedores sin registro sanitario',
            value: missingSanitaryReg,
            valueFormatter: 'number',
            severity: 'warn',
            tooltip: 'Proveedores que requieren actualizar su registro sanitario',
            ctaLabel: 'Ver proveedores',
            ctaAction: { type: 'emit', key: 'open-suppliers-missing-details' }, // Clave personalizada
            visible: true
          });
        }

        return slot;
      }),
      startWith(this.loadingSlotActions),
      catchError(() => {
        return of({
          id: 'acciones',
          title: 'Acciones',
          slides: [],
          error: { message: 'Error cargando acciones' }
        } as KpiSlotVM);
      })
    );
  }

  /**
   * Carga los datos reales para el pie chart de proveedores
   */
  loadSupplierChart(): void {
    this.supplierChartLoading = true;

    this.invoiceService.getInvoices().subscribe({
      next: (invoices) => {
        this.allInvoices = invoices;
        this.updateSupplierChart();
        this.supplierChartLoading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando facturas para el gráfico:', err);
        this.supplierChartLoading = false;
        this.cd.markForCheck();
      }
    });
  }



  /**
   * Actualiza el gráfico de proveedores con las facturas de la semana actual
   */
  private updateSupplierChart(): void {
    const filteredInvoices = this.filterInvoicesByPeriod(this.allInvoices, this.supplierPeriod);
    this.processInvoicesForChart(filteredInvoices);
  }

  /**
   * Filtra facturas por período de tiempo
   */
  private filterInvoicesByPeriod(invoices: Invoice[], period: string): Invoice[] {
    if (period === 'all') {
      return invoices;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.date);

      switch (period) {
        case 'today':
          return invoiceDate >= today;
        case 'week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lunes
          return invoiceDate >= startOfWeek;
        case 'month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return invoiceDate >= startOfMonth;
        case 'year':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          return invoiceDate >= startOfYear;
        default:
          return true;
      }
    });
  }

  /**
   * Inicializa las opciones del chart de gasto mensual cuando se abre el panel de proveedores
   */
  initMonthlyExpenseChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Obtener años únicos de las facturas
    const years = new Set<number>();
    this.allInvoices.forEach(inv => {
      const year = new Date(inv.date).getFullYear();
      years.add(year);
    });

    // Crear opciones de año ordenadas descendentemente
    this.yearOptions = Array.from(years)
      .sort((a, b) => b - a)
      .map(y => ({ label: y.toString(), value: y }));

    if (this.yearOptions.length > 0 && !this.yearOptions.find(y => y.value === this.selectedYear)) {
      this.selectedYear = this.yearOptions[0].value;
    }

    // Obtener proveedores únicos de las facturas
    const suppliersMap = new Map<string, string>();
    this.allInvoices.forEach(inv => {
      if (inv.supplier?.id && inv.supplier?.name) {
        suppliersMap.set(inv.supplier.id, inv.supplier.name);
      }
    });

    // Crear opciones de proveedor
    this.supplierOptions = [
      { label: 'Todos los proveedores', value: 'all' },
      ...Array.from(suppliersMap.entries())
        .map(([id, name]) => ({ label: name, value: id }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ];

    this.updateMonthlyExpenseChart();
  }

  /**
   * Actualiza el bar chart de gasto mensual según año y proveedor seleccionados
   */
  updateMonthlyExpenseChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Filtrar facturas por año
    const yearInvoices = this.allInvoices.filter(inv => {
      const invoiceYear = new Date(inv.date).getFullYear();
      return invoiceYear === this.selectedYear;
    });

    if (this.selectedSupplierId === 'all') {
      // STACKED BAR: Crear un dataset por cada proveedor
      const suppliersData = new Map<string, { name: string; monthlyTotals: number[] }>();

      yearInvoices.forEach(inv => {
        const supplierId = inv.supplier?.id || 'unknown';
        const supplierName = inv.supplier?.name || 'Desconocido';
        const month = new Date(inv.date).getMonth();
        const amount = parseFloat(inv.amount) || 0;

        if (!suppliersData.has(supplierId)) {
          suppliersData.set(supplierId, {
            name: supplierName,
            monthlyTotals: new Array(12).fill(0)
          });
        }
        suppliersData.get(supplierId)!.monthlyTotals[month] += amount;
      });

      // Ordenar proveedores por total descendente y tomar los top 8
      const sortedSuppliers = Array.from(suppliersData.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          monthlyTotals: data.monthlyTotals.map(t => Math.round(t * 100) / 100),
          total: data.monthlyTotals.reduce((sum, t) => sum + t, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      // Generar datasets con colores consistentes basados en el ID del proveedor
      const datasets = sortedSuppliers.map((supplier) => ({
        label: supplier.name,
        data: supplier.monthlyTotals,
        backgroundColor: this.getSupplierColor(supplier.id),
        borderWidth: 0,
        borderRadius: 2
      }));

      this.monthlyExpenseChartData = {
        labels: monthLabels,
        datasets: datasets
      };

      this.monthlyExpenseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const value = context.raw as number;
                return ` ${context.dataset.label}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: {
              stepSize: 500,
              autoSkip: false,
              maxTicksLimit: 30,
              callback: (value: number) => this.formatCurrency(value)
            }
          }
        }
      };
    } else {
      // SINGLE BAR: Un solo proveedor seleccionado
      const filteredInvoices = yearInvoices.filter(inv => inv.supplier?.id === this.selectedSupplierId);

      const monthlyTotals = new Array(12).fill(0);
      filteredInvoices.forEach(inv => {
        const month = new Date(inv.date).getMonth();
        monthlyTotals[month] += parseFloat(inv.amount) || 0;
      });

      const roundedTotals = monthlyTotals.map(t => Math.round(t * 100) / 100);

      // Usar el color consistente del proveedor
      const supplierColor = this.getSupplierColor(this.selectedSupplierId);

      this.monthlyExpenseChartData = {
        labels: monthLabels,
        datasets: [
          {
            label: 'Gasto mensual',
            data: roundedTotals,
            backgroundColor: supplierColor,
            borderColor: this.darkenColor(supplierColor),
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      };

      this.monthlyExpenseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const value = context.raw as number;
                return ` ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: {
              stepSize: 500,
              callback: (value: number) => this.formatCurrency(value)
            }
          }
        }
      };
    }

    this.cd.markForCheck();
  }

  /**
   * Handler para cambio de año en el bar chart
   */
  onYearChange(): void {
    this.updateMonthlyExpenseChart();
  }

  /**
   * Handler para cambio de proveedor en el bar chart
   */
  onSupplierFilterChange(): void {
    this.updateMonthlyExpenseChart();
  }



  /**
   * Procesa las facturas y agrupa por proveedor para el pie chart
   */
  private processInvoicesForChart(invoices: Invoice[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Agrupar facturas por proveedor y sumar importes (usando ID como clave)
    const supplierTotals = new Map<string, { id: string; name: string; total: number }>();

    invoices.forEach(invoice => {
      const supplierId = invoice.supplier?.id || 'unknown';
      const supplierName = invoice.supplier?.name || 'Sin proveedor';
      const amount = parseFloat(invoice.amount) || 0;

      if (supplierTotals.has(supplierId)) {
        const current = supplierTotals.get(supplierId)!;
        current.total += amount;
      } else {
        supplierTotals.set(supplierId, { id: supplierId, name: supplierName, total: amount });
      }
    });

    // Convertir a array y ordenar por total (descendente)
    const sortedSuppliers = Array.from(supplierTotals.values())
      .sort((a, b) => b.total - a.total);

    // Tomar los top 6 y agrupar el resto en "Otros"
    const MAX_SUPPLIERS = 6;
    let chartSuppliers = sortedSuppliers.slice(0, MAX_SUPPLIERS);

    if (sortedSuppliers.length > MAX_SUPPLIERS) {
      const otrosTotal = sortedSuppliers
        .slice(MAX_SUPPLIERS)
        .reduce((sum, s) => sum + s.total, 0);

      chartSuppliers.push({ id: 'otros', name: 'Otros', total: otrosTotal });
    }

    // Calcular total
    this.supplierChartTotal = chartSuppliers.reduce((sum, s) => sum + s.total, 0);

    // Generar datos del chart con colores consistentes basados en ID
    const labels = chartSuppliers.map(s => s.name);
    const data = chartSuppliers.map(s => Math.round(s.total * 100) / 100);
    const colors = chartSuppliers.map(s => this.getSupplierColor(s.id));

    // Guardar resumen para el panel lateral
    this.supplierSummary = chartSuppliers.map((s) => ({
      name: s.name,
      total: Math.round(s.total * 100) / 100,
      color: this.getSupplierColor(s.id)
    }));

    this.supplierChartData = {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          hoverBackgroundColor: colors.map(c => this.darkenColor(c)),
          borderWidth: 0
        }
      ]
    };

    this.supplierChartOptions = {
      cutout: '60%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.raw as number;
              return ` ${context.label}: ${this.formatCurrency(value)}`;
            }
          }
        }
      },
      maintainAspectRatio: false
    };
  }





  /**
   * Genera un color consistente para un proveedor basado en su ID
   */
  private getSupplierColor(supplierId: string): string {
    // Calcular hash simple del ID
    let hash = 0;
    for (let i = 0; i < supplierId.length; i++) {
      const char = supplierId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }

    // Usar el hash para seleccionar un color del array
    const index = Math.abs(hash) % this.CHART_COLORS.length;
    return this.CHART_COLORS[index];
  }

  /**
   * Oscurece un color hex para el hover
   */
  private darkenColor(hex: string): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = -25;
    const R = Math.max(0, (num >> 16) + amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) + amt);
    const B = Math.max(0, (num & 0x0000FF) + amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }

  /**
   * Formatea un número como moneda EUR
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  }

  /**
   * Handler para click en un slot/slide
   */
  onSlotClick(event: KpiSlotClickEvent): void {
    console.log('🔵 Slot Click:', event);
  }

  /**
   * Abre un panel lateral de métricas
   */
  openPanel(panel: 'suppliers' | 'products' | 'articles' | 'sales' | 'gestoria' | 'staff' | 'appcc' | 'docs'): void {
    this.activePanel = panel;

    // Inicializar bar chart cuando se abre el panel de proveedores
    if (panel === 'suppliers') {
      this.initMonthlyExpenseChart();
    }
  }

  /**
   * Cierra el panel lateral activo
   */
  closePanel(): void {
    this.activePanel = null;
  }

  /**
   * Handler para cambio de slide
   */
  onSlideChange(event: KpiSlideChangeEvent): void {
    console.log('🔄 Slide Change:', event);
  }

  /**
   * Handler para retry tras error en slot Actividad
   */
  onRetryActividad(): void {
    console.log('🔄 Retry Actividad requested');
    this.loadActividadSlot();
  }

  /**
   * Handler para retry tras error en slot Incidencias
   */
  onRetryIncidencias(): void {
    console.log('🔄 Retry Incidencias requested');
    this.loadIncidenciasSlot();
  }
}
