import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KpiSlotComponent } from './components/kpi-slot/kpi-slot.component';
import { DashboardKpiSlotMockService } from './services/dashboard-kpi-slot.mock.service';
import { KpiSlotVM, KpiSlotClickEvent, KpiSlideChangeEvent } from './interfaces/kpi-slot.interfaces';
import { Observable, startWith, forkJoin } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { InvoiceService } from '../invoices/services/invoice.service';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastService } from '@app/shared/services/toast.service';

import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Componente principal del Dashboard
 * Muestra KPI slots y cards de métricas del restaurante
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, KpiSlotComponent, ChartModule, DropdownModule, SkeletonModule, IconComponent],
  templateUrl: './dashboard.component.html'
})
export class Dashboard implements OnInit {
  private kpiSlotService = inject(DashboardKpiSlotMockService);
  private invoiceService = inject(InvoiceService);
  private platformId = inject(PLATFORM_ID);
  private cd = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  /** Observable del slot de Actividad con estado loading inicial */
  actividadSlot$!: Observable<KpiSlotVM>;

  /** Observable del slot de Incidencias con estado loading inicial */
  incidenciasSlot$!: Observable<KpiSlotVM>;

  /** Datos del pie chart de proveedores */
  supplierChartData: any;
  supplierChartOptions: any;
  supplierChartLoading = true;
  supplierChartTotal = 0;


  /** Período fijo para el gráfico de proveedores (siempre semana actual) */
  private readonly supplierPeriod = 'week';

  /** Almacén de todas las facturas para filtrar localmente */
  private allInvoices: Invoice[] = [];

  /** Datos del pie chart de categorías de productos */
  productChartData: any;
  productChartOptions: any;
  productChartLoading = true;
  productChartTotal = 0;

  /** Panel lateral activo: null = cerrado, 'suppliers' | 'products' | 'articles' | 'sales' | 'staff' */
  activePanel: 'suppliers' | 'products' | 'articles' | 'sales' | 'staff' | null = null;

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

  /** Datos fake del gráfico de ventas */
  salesChartData: any;
  salesChartOptions: any;

  /** Genera datos fake para el gráfico de ventas al iniciar */
  initSalesChart(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = Math.floor(now.getMinutes() / 15) * 15;

    // Generar etiquetas de tiempo (cada 15 min, desde hace 2h hasta +30min)
    const labels: string[] = [];
    const startOffset = -8; // 8 intervalos atrás = 2 horas
    const endOffset = 2;    // 2 intervalos adelante = 30 min

    for (let i = startOffset; i <= endOffset; i++) {
      const totalMinutes = currentHour * 60 + currentMinutes + (i * 15);
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      labels.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }

    // Datos fake acumulativos (ventas van subiendo)
    const todayData = [0, 150, 320, 480, 650, 890, 1050, 1280, 1450, null, null];
    const lastWeekData = [0, 180, 350, 520, 720, 950, 1180, 1420, 1620, 1780, 1900];
    const historicalData = [0, 165, 340, 510, 700, 920, 1150, 1380, 1580, 1720, 1850];

    this.salesChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Hoy',
          data: todayData,
          borderColor: '#6B9080',
          backgroundColor: 'rgba(107, 144, 128, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#6B9080',
          borderWidth: 2
        },
        {
          label: 'Semana pasada',
          data: lastWeekData,
          borderColor: '#F59E0B',
          backgroundColor: 'transparent',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          borderDash: [5, 5],
          borderWidth: 2
        },
        {
          label: 'Media histórica',
          data: historicalData,
          borderColor: '#9CA3AF',
          backgroundColor: 'transparent',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          borderDash: [2, 2],
          borderWidth: 1.5
        }
      ]
    };

    this.salesChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 8,
            font: { size: 10 }
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.raw as number;
              return value !== null ? ` ${context.dataset.label}: ${this.formatCurrency(value)}` : '';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 9 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f3f4f6' },
          ticks: {
            stepSize: 250,
            font: { size: 9 },
            callback: (value: number) => `${value}€`
          }
        }
      }
    };
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

  ngOnInit(): void {
    this.loadActividadSlot();
    this.loadIncidenciasSlot();
    this.loadSupplierChart();
    this.loadProductChart();
    this.initSalesChart();
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
   * Carga los datos reales para el pie chart de categorías de productos
   */
  loadProductChart(): void {
    this.productChartLoading = true;

    this.invoiceService.getProducts().subscribe({
      next: (products) => {
        this.processProductsForChart(products);
        this.productChartLoading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando productos para el gráfico:', err);
        this.productChartLoading = false;
        this.cd.markForCheck();
      }
    });
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
   * Procesa los productos y agrupa por categoría para el pie chart
   */
  private processProductsForChart(products: any[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Si no hay productos, mostrar empty state
    if (!products || products.length === 0) {
      this.productChartData = null;
      this.productChartTotal = 0;
      return;
    }

    // Agrupar productos por categoría
    const categoryTotals = new Map<string, { name: string; count: number }>();

    products.forEach(product => {
      const categoryName = product.category?.name || 'Sin categoría';

      if (categoryTotals.has(categoryName)) {
        const current = categoryTotals.get(categoryName)!;
        current.count += 1;
      } else {
        categoryTotals.set(categoryName, { name: categoryName, count: 1 });
      }
    });

    // Convertir a array y ordenar por cantidad (descendente)
    const chartCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.count - a.count);

    // Calcular total
    this.productChartTotal = chartCategories.reduce((sum, c) => sum + c.count, 0);

    // Generar datos del chart
    const labels = chartCategories.map(c => c.name);
    const data = chartCategories.map(c => c.count);
    // Asignar colores según el nombre de la categoría (igual que getCategoryStyle en productos)
    const colors = chartCategories.map(c => this.getCategoryColor(c.name));

    this.productChartData = {
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

    this.productChartOptions = {
      cutout: '60%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.raw as number;
              return ` ${context.label}: ${value} productos`;
            }
          }
        }
      },
      maintainAspectRatio: false
    };
  }

  /**
   * Obtiene el color de fondo para una categoría (igual que getCategoryStyle en productos)
   */
  private getCategoryColor(category: string): string {
    switch (category.toLowerCase()) {
      case 'verduras':
        return '#4ade80';
      case 'frutas':
        return '#86efac';
      case 'carnes':
        return '#f87171';
      case 'pescados y mariscos':
        return '#2dd4bf';
      case 'secos y granos':
        return '#fbbf24';
      case 'panadería':
        return '#fb923c';
      case 'conservas':
        return '#fcd34d';
      case 'aceites y condimentos':
        return '#facc15';
      case 'lácteos':
      case 'lacteos':
        return '#60a5fa';
      case 'repostería y pastelería':
        return '#f472b6';
      case 'bebidas':
        return '#22d3ee';
      case 'limpieza':
        return '#a78bfa';
      case 'packaging':
        return '#94a3b8';
      case 'útiles y menaje':
        return '#9ca3af';
      case 'otros':
        return '#d1d5db';
      default:
        return '#6B9080';
    }
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
  openPanel(panel: 'suppliers' | 'products' | 'articles' | 'sales'): void {
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
