import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { forkJoin } from 'rxjs';
import { InvoiceService } from '../invoices/services/invoice.service';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { ChartHelper } from '@app/shared/helpers/chart.helper';

interface MetricContext {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  type: 'money' | 'supplier' | 'invoice' | 'category';
  description: string;
  trend?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarModule, ChartModule, TableModule, ButtonModule],
  templateUrl: './dashboard.component.html'
})
export class Dashboard implements OnInit {
  private invoiceService = inject(InvoiceService);
  private chartHelper = inject(ChartHelper);

  // Data State
  invoices: Invoice[] = [];
  products: any[] = []; // Cache products
  productCategoryMap = new Map<string, string>(); // ID/Name -> Category Name

  metrics: MetricContext[] = [];
  metricsByCategory: any[] = [];
  
  loading = true;

  // Sidebar State
  sidebarVisible = false;
  selectedMetric: MetricContext | null = null;

  // Detail Data Placeholders
  detailChartData: any;
  detailChartOptions: any;
  
  // Money Detail Specifics
  timeRange: '3M' | '6M' | '1Y' | 'ALL' = 'ALL';
  timeFilterOptions: ('3M' | '6M' | '1Y' | 'ALL')[] = ['3M', '6M', '1Y', 'ALL'];
  moneyKPIs = {
    total: 0,
    average: 0,
    max: 0,
    maxMonth: ''
  };
  distributionChartData: any;
  distributionChartOptions: any;

  // Category Detail Specifics
  categoryKPIs = {
      topCategory: '-',
      topCategoryAmount: 0,
      categorizedPercentage: 0
  };
  categoryChartData: any;
  categoryChartOptions: any;

  detailTableData: any[] = [];

  ngOnInit() {
    this.loadData();
    this.initChartOptions();
  }

  private loadData() {
    this.loading = true;
    // 1. Fetch Products
    this.invoiceService.getProducts().subscribe({
        next: (products) => {
            this.products = products;
            // Build Map
             this.products.forEach(p => {
                if (p.id && p.category?.name) {
                    this.productCategoryMap.set(p.id, p.category.name);
                }
            });

            // 2. Fetch Invoices (Lite)
            this.invoiceService.getInvoices().subscribe({
                next: (invoices) => {
                    // 3. Fetch Details for Invoices (to get Lines)
                    // Optimization: We might not need ALL invoices for the category chart if there are thousands.
                    // But for accurate TOTAL spend analysis we need them.
                    // If the list is small (e.g. < 100), we can fetch all.
                    // Let's take the last 50 for the category breakdown to be fast.
                    
                    const recentInvoices = invoices.slice(0, 50); 
                    const detailRequests = recentInvoices.map(inv => this.invoiceService.getInvoiceById(inv.id));
                    
                    forkJoin(detailRequests).subscribe({
                        next: (detailedInvoices) => {
                            // Merge detailed lines back into main invoice list or use detailed list for category analysis
                            this.invoices = invoices.map(inv => {
                                const detail = detailedInvoices.find(d => d.id === inv.id);
                                return detail ? detail : inv;
                            });
                            
                            this.calculateMetrics();
                            this.loading = false;
                        },
                        error: (err) => {
                            console.error('Error fetching invoice details:', err);
                            // Fallback to lite invoices
                            this.invoices = invoices;
                            this.calculateMetrics();
                            this.loading = false;
                        }
                    });
                },
                error: (e) => {
                    console.error(e);
                    this.loading = false;
                }
            });
        },
        error: (e) => {
             console.error('Error loading products:', e);
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

    // 4. Category Spend Analysis
    const categorySpend = new Map<string, number>();
    let categorizedTotal = 0;

    // Normalization helper
    const normalize = (s: string) => s ? s.toLowerCase().trim() : '';

    this.invoices.forEach((inv, index) => {
        // Access lines with fallback
        const lines = inv.invoiceLines || (inv as any).lines || [];
        
        // Debug first invoice
        if (index === 0) {
            console.log('DEBUG: Processing First Invoice Lines:', lines);
            console.log('DEBUG: Original invoice object:', inv);
        }

        if(lines && lines.length > 0) {
            lines.forEach((line: any) => { // Cast to any to safely access props
                let categoryName = 'Sin Categorizar';
                
                // 1. Try suppliersProductId (if it maps to our internal Product ID)
                if (line.suppliersProductId) {
                    // Try direct map
                    if (this.productCategoryMap.has(line.suppliersProductId)) {
                        categoryName = this.productCategoryMap.get(line.suppliersProductId)!;
                    } 
                    // Try finding product where product.id === suppliersProductId (if map didn't catch it?)
                    // The map is built from p.id -> name. So check is sufficient.
                }

                // 2. Fallback: Fuzzy Name Match
                if (categoryName === 'Sin Categorizar') {
                    const desc = normalize(line.description || '');
                    if (desc) {
                         // Find any product whose name is contained in description OR description contained in name
                         const match = this.products.find(p => {
                             const pName = normalize(p.name);
                             return pName === desc || desc.includes(pName) || pName.includes(desc);
                         });

                         if (match) {
                             if (match.category?.name) {
                                 categoryName = match.category.name;
                             } else {
                                console.warn('Match found but no category name:', match);
                             }
                         }
                    }
                }
                
                // Debugging specific lines to see why they fail
                // if (categoryName === 'Sin Categorizar' && line.description?.toLowerCase().includes('refresco')) {
                //      console.log('Failed to categorize:', line.description);
                // }

                const amount = Number(line.quantity) * Number(line.unitPrice); 
                const current = categorySpend.get(categoryName) || 0;
                categorySpend.set(categoryName, current + amount);
                
                if (categoryName !== 'Sin Categorizar') {
                     categorizedTotal += amount;
                }
            });
        }
    });

    console.log('Category Spend Map:', categorySpend);
    console.log('Total Spend:', totalSpend);
    console.log('Categorized Total:', categorizedTotal);
    
    // Sort Categories
    this.metricsByCategory = Array.from(categorySpend.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);

    // Identify Top Category
    // We allow 'Sin Categorizar' to be the top if it's the only one, but exclude it if others exist?
    // Better to show the REAL top spender even if it is 'Sin Categorizar', so user knows they need to categorize.
    // However, usually KPI wants to show the top *Product* category.
    // Let's find top *categorized* if possible.
    
    let topCatObj = this.metricsByCategory.find(c => c.name !== 'Sin Categorizar');
    if (!topCatObj && this.metricsByCategory.length > 0) {
        topCatObj = this.metricsByCategory[0]; // Fallback if only Uncategorized exists
    }
    
    const topCatName = topCatObj ? topCatObj.name : 'Sin datos';
    const topCatVal = topCatObj ? topCatObj.value : 0;

    this.categoryKPIs = {
        topCategory: topCatName,
        topCategoryAmount: topCatVal,
        categorizedPercentage: totalSpend > 0 ? (categorizedTotal / totalSpend) * 100 : 0
    };
    
    console.log('Category KPI:', this.categoryKPIs); // Debug

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
        id: 'category_spend',
        title: 'Gastos por Categoría',
        value: this.metricsByCategory.length > 0 ? topCatName : 'Sin datos',
        icon: 'pi pi-tags',
        type: 'category',
        description: 'Análisis de compras por familias'
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
    this.categoryChartData = null;

    switch (metric.type) {
      case 'money':
        this.updateSpendAnalysis('ALL');
        break;
      case 'category':
        this.prepareCategoryAnalysis();
        break;
      case 'supplier':
        this.prepareSupplierRanking();
        break;
      case 'invoice':
        this.prepareRecentInvoices();
        break;
    }
  }
  
  private prepareCategoryAnalysis() {
      this.updateCategoryAnalysis('ALL');
  }

  updateCategoryAnalysis(range: '3M' | '6M' | '1Y' | 'ALL') {
    this.timeRange = range;
    const now = new Date();
    let startDate: Date | null = null;

    if (range === '3M') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (range === '6M') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (range === '1Y') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    }

    const filteredInvoices = startDate 
        ? this.invoices.filter(inv => new Date(inv.date) >= startDate!)
        : this.invoices;
    
    // Recalculate Category Spend for filtered range
    const categorySpend = new Map<string, number>();
    let categorizedTotal = 0;
    const totalSpend = filteredInvoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
    
    filteredInvoices.forEach(inv => {
        if(inv.invoiceLines) {
            inv.invoiceLines.forEach(line => {
                let categoryName = 'Sin Categorizar';
                if (line.suppliersProductId && this.productCategoryMap.has(line.suppliersProductId)) {
                     categoryName = this.productCategoryMap.get(line.suppliersProductId)!;
                } else {
                     const match = this.products.find(p => p.name === line.description);
                     if(match && match.category?.name) {
                        categoryName = match.category.name;
                    }
                }
                
                const amount = Number(line.quantity) * Number(line.unitPrice);
                const current = categorySpend.get(categoryName) || 0;
                categorySpend.set(categoryName, current + amount);
                
                if (categoryName !== 'Sin Categorizar') categorizedTotal += amount;
            });
        }
    });

    // Update KPIs
    let topCatName = '-';
    let topCatVal = 0;
    categorySpend.forEach((val, key) => {
        if(key !== 'Sin Categorizar' && val > topCatVal) {
            topCatVal = val;
            topCatName = key;
        }
    });
    
    this.categoryKPIs = {
        topCategory: topCatName,
        topCategoryAmount: topCatVal,
        categorizedPercentage: totalSpend > 0 ? (categorizedTotal / totalSpend) * 100 : 0
    };

    // Update Chart Data
    const sortedCats = Array.from(categorySpend.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);

    // Limit to Top 10 for readability
    const topCats = sortedCats.slice(0, 10);
    
    this.categoryChartData = {
          labels: topCats.map(c => c.name),
          datasets: [
              {
                  label: 'Gasto por Categoría (€)',
                  data: topCats.map(c => c.value),
                  backgroundColor: this.chartHelper.getColor('--p-purple-500'),
                  borderColor: this.chartHelper.getColor('--p-purple-500'),
                  borderRadius: 4,
                  barThickness: 24
              }
          ]
    };
    
    this.categoryChartOptions = this.chartHelper.getCommonOptions({
        indexAxis: 'y',
        plugins: {
            legend: { display: false }
        }
    });
  }

  updateSpendAnalysis(range: '3M' | '6M' | '1Y' | 'ALL') {
    this.timeRange = range;
    const now = new Date();
    let startDate: Date | null = null;

    if (range === '3M') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Current month - 2 previous
    } else if (range === '6M') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (range === '1Y') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    }

    const filteredInvoices = startDate 
        ? this.invoices.filter(inv => new Date(inv.date) >= startDate!)
        : this.invoices;

    // 1. KPIs Calculation
    const total = filteredInvoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
    
    // Group by Month (YYYY-MM) for Evolution & Average
    const monthlySpend = new Map<string, number>();
    const supplierSpend = new Map<string, number>();

    // Sort chronological first
    const sorted = [...filteredInvoices].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(inv => {
      const date = new Date(inv.date);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const amount = Number(inv.amount || 0);

      monthlySpend.set(key, (monthlySpend.get(key) || 0) + amount);
      
      const supplierName = inv.supplier?.name || 'Otros';
      supplierSpend.set(supplierName, (supplierSpend.get(supplierName) || 0) + amount);
    });

    const monthsCount = monthlySpend.size || 1;
    const average = total / monthsCount;
    
    let max = 0;
    let maxMonth = '-';
    monthlySpend.forEach((val, key) => {
        if(val > max) {
            max = val;
            maxMonth = key; // YYYY-MM
        }
    });

    this.moneyKPIs = {
        total,
        average,
        max,
        maxMonth
    };

    // 2. Evolution Chart Data
    this.detailChartData = {
      labels: Array.from(monthlySpend.keys()),
      datasets: [{
        label: 'Gasto (€)',
        data: Array.from(monthlySpend.values()),
        backgroundColor: this.chartHelper.getColor('--p-green-500'),
        borderColor: this.chartHelper.getColor('--p-green-500'),
        borderRadius: 6
      }]
    };

    // 3. Distribution Chart Data (Top 5 Suppliers + Others)
    const sortedSuppliers = Array.from(supplierSpend.entries()).sort((a, b) => b[1] - a[1]);
    const topSuppliers = sortedSuppliers.slice(0, 5);
    const otherTotal = sortedSuppliers.slice(5).reduce((acc, curr) => acc + curr[1], 0);
    
    if (otherTotal > 0) topSuppliers.push(['Otros', otherTotal]);

    this.distributionChartData = {
        labels: topSuppliers.map(s => s[0]),
        datasets: [{
            data: topSuppliers.map(s => s[1]),
            backgroundColor: this.chartHelper.getThemePalette(),
            borderColor: this.chartHelper.getColor('--p-content-border-color')
        }]
    };

    this.distributionChartOptions = this.chartHelper.getCommonOptions({
        plugins: {
            legend: {
                position: 'right',
                align: 'center',
                labels: { 
                    usePointStyle: true, 
                    boxWidth: 12, 
                    padding: 10,
                }
            }
        },
        scales: {},
        layout: {
            padding: 20
        }
    });
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
    this.detailChartOptions = this.chartHelper.getCommonOptions({
        plugins: {
            legend: { display: false }
        },
        scales: {
             x: {
                 grid: { display: false }
             }
        }
    });
  }
}
