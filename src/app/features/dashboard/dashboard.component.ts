import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InvoiceService } from '../invoices/services/invoice.service';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';

interface MetricContext {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  type: 'money' | 'supplier' | 'invoice';
  description: string;
  trend?: string; // e.g. "+12% vs last month" (Static for now or calculated if possible)
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarModule, ChartModule, TableModule, ButtonModule],
  templateUrl: './dashboard.component.html'
})
export class Dashboard implements OnInit {
  private invoiceService = inject(InvoiceService);

  // Data State
  invoices: Invoice[] = [];
  metrics: MetricContext[] = [];
  loading = true;

  // Sidebar State
  sidebarVisible = false;
  selectedMetric: MetricContext | null = null;
  
  // Detail Data Placeholders
  detailChartData: any;
  detailChartOptions: any;
  detailTableData: any[] = [];

  ngOnInit() {
    this.loadData();
    this.initChartOptions();
  }

  private loadData() {
    this.invoiceService.getInvoices().subscribe({
      next: (data) => {
        this.invoices = data;
        this.calculateMetrics();
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  private calculateMetrics() {
    // 1. Total Spend
    const totalSpend = this.invoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
    
    // 2. Unique Suppliers
    const uniqueSuppliers = new Set(this.invoices.map(i => i.supplier?.id).filter(id => !!id)).size;

    // 3. Total Invoices
    const totalCount = this.invoices.length;

    this.metrics = [
      {
        id: 'total_spend',
        title: 'Gasto Histórico',
        value: totalSpend,
        icon: 'pi pi-euro',
        type: 'money',
        description: 'Total acumulado en facturas registradas'
      },
      {
        id: 'suppliers',
        title: 'Proveedores Activos',
        value: uniqueSuppliers,
        icon: 'pi pi-truck',
        type: 'supplier',
        description: 'Proveedores con al menos una factura'
      },
      {
        id: 'invoices',
        title: 'Facturas Procesadas',
        value: totalCount,
        icon: 'pi pi-file',
        type: 'invoice',
        description: 'Documentos digitalizados en el sistema'
      }
    ];
  }

  openMetricDetail(metric: MetricContext) {
    this.selectedMetric = metric;
    this.sidebarVisible = true;
    this.prepareDetailView(metric);
  }

  private prepareDetailView(metric: MetricContext) {
    // Reset data
    this.detailChartData = null;
    this.detailTableData = [];

    switch (metric.type) {
      case 'money':
        this.prepareSpendAnalysis();
        break;
      case 'supplier':
        this.prepareSupplierRanking();
        break;
      case 'invoice':
        this.prepareRecentInvoices();
        break;
    }
  }

  private prepareSpendAnalysis() {
    // Group by Month (YYYY-MM)
    const monthlySpend = new Map<string, number>();
    
    // Sort chronological first
    const sorted = [...this.invoices].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(inv => {
      const date = new Date(inv.date);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const current = monthlySpend.get(key) || 0;
      monthlySpend.set(key, current + Number(inv.amount || 0));
    });

    this.detailChartData = {
      labels: Array.from(monthlySpend.keys()),
      datasets: [{
        label: 'Gasto Mensual (€)',
        data: Array.from(monthlySpend.values()),
        backgroundColor: '#10b981',
        borderRadius: 8
      }]
    };
  }

  private prepareSupplierRanking() {
    const supplierSpend = new Map<string, number>();
    this.invoices.forEach(inv => {
        const name = inv.supplier?.name || 'Desconocido';
        const current = supplierSpend.get(name) || 0;
        supplierSpend.set(name, current + Number(inv.amount || 0));
    });

    // Convert to array and sort desc
    this.detailTableData = Array.from(supplierSpend.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }

  private prepareRecentInvoices() {
    // Get last 20 invoices
    this.detailTableData = [...this.invoices]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
      .map(inv => ({
        ...inv,
        supplierName: inv.supplier?.name || 'Desconocido'
      }));
  }

  private initChartOptions() {
    this.detailChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f3f4f6' } }
      }
    };
  }
}
