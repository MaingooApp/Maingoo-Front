import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { KpiSlotComponent } from './components/kpi-slot/kpi-slot.component';
import { DashboardKpiSlotMockService } from './services/dashboard-kpi-slot.mock.service';
import { KpiSlotVM, KpiSlotClickEvent, KpiSlideChangeEvent } from './interfaces/kpi-slot.interfaces';
import { Observable, startWith, forkJoin } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { InvoiceService } from '../invoices/services/invoice.service';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Componente principal del Dashboard
 * Muestra KPI slots y cards de métricas del restaurante
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, KpiSlotComponent, ChartModule, SkeletonModule],
  templateUrl: './dashboard.component.html'
})
export class Dashboard implements OnInit {
  private kpiSlotService = inject(DashboardKpiSlotMockService);
  private invoiceService = inject(InvoiceService);
  private platformId = inject(PLATFORM_ID);
  private cd = inject(ChangeDetectorRef);

  /** Observable del slot de Actividad con estado loading inicial */
  actividadSlot$!: Observable<KpiSlotVM>;

  /** Observable del slot de Incidencias con estado loading inicial */
  incidenciasSlot$!: Observable<KpiSlotVM>;

  /** Datos del pie chart de proveedores */
  supplierChartData: any;
  supplierChartOptions: any;
  supplierChartLoading = true;
  supplierChartTotal = 0;

  /** Datos del pie chart de categorías de productos */
  productChartData: any;
  productChartOptions: any;
  productChartLoading = true;
  productChartTotal = 0;

  /** Panel lateral activo: null = cerrado, 'suppliers' | 'products' | 'articles' */
  activePanel: 'suppliers' | 'products' | 'articles' | null = null;

  /** Lista resumen de proveedores para el panel */
  supplierSummary: { name: string; total: number; color: string }[] = [];

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
        this.processInvoicesForChart(invoices);
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

    // Agrupar facturas por proveedor y sumar importes
    const supplierTotals = new Map<string, { name: string; total: number }>();

    invoices.forEach(invoice => {
      const supplierName = invoice.supplier?.name || 'Sin proveedor';
      const amount = parseFloat(invoice.amount) || 0;

      if (supplierTotals.has(supplierName)) {
        const current = supplierTotals.get(supplierName)!;
        current.total += amount;
      } else {
        supplierTotals.set(supplierName, { name: supplierName, total: amount });
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

      chartSuppliers.push({ name: 'Otros', total: otrosTotal });
    }

    // Calcular total
    this.supplierChartTotal = chartSuppliers.reduce((sum, s) => sum + s.total, 0);

    // Generar datos del chart
    const labels = chartSuppliers.map(s => s.name);
    const data = chartSuppliers.map(s => Math.round(s.total * 100) / 100);
    const colors = chartSuppliers.map((_, i) =>
      this.CHART_COLORS[i] || this.CHART_COLORS[this.CHART_COLORS.length - 1]
    );

    // Guardar resumen para el panel lateral
    this.supplierSummary = chartSuppliers.map((s, i) => ({
      name: s.name,
      total: Math.round(s.total * 100) / 100,
      color: colors[i]
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
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 12,
            font: {
              size: 11
            }
          }
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
    const sortedCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.count - a.count);

    // Tomar los top 6 y agrupar el resto en "Otros"
    const MAX_CATEGORIES = 6;
    let chartCategories = sortedCategories.slice(0, MAX_CATEGORIES);

    if (sortedCategories.length > MAX_CATEGORIES) {
      const otrosCount = sortedCategories
        .slice(MAX_CATEGORIES)
        .reduce((sum, c) => sum + c.count, 0);

      chartCategories.push({ name: 'Otros', count: otrosCount });
    }

    // Calcular total
    this.productChartTotal = chartCategories.reduce((sum, c) => sum + c.count, 0);

    // Generar datos del chart
    const labels = chartCategories.map(c => c.name);
    const data = chartCategories.map(c => c.count);
    const colors = chartCategories.map((_, i) =>
      this.CHART_COLORS[i] || this.CHART_COLORS[this.CHART_COLORS.length - 1]
    );

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
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 12,
            font: {
              size: 11
            }
          }
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
  openPanel(panel: 'suppliers' | 'products' | 'articles'): void {
    this.activePanel = panel;
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
