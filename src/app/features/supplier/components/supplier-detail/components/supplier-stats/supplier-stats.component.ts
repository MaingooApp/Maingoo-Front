import { Component, Input, OnChanges, SimpleChanges, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Invoice } from '../../../../../../core/interfaces/Invoice.interfaces';

@Component({
	selector: 'app-supplier-stats',
	standalone: true,
	imports: [CommonModule, FormsModule, ChartModule, DropdownModule, IconComponent],
	templateUrl: './supplier-stats.component.html'
})
export class SupplierStatsComponent implements OnChanges {
	@Input() invoices: Invoice[] = [];

	showStats = false;

	chartData: any;
	historyChartData: any;
	chartOptions: any;

	availableYears: { label: string; value: number }[] = [];
	selectedYear: number = new Date().getFullYear();

	constructor(@Inject(LOCALE_ID) private locale: string) { }

	ngOnChanges(changes: SimpleChanges) {
		if (changes['invoices']) {
			this.initChartOptions();
			this.updateChartData(this.invoices);
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
						label: function (context: any) {
							return context.parsed.y + ' EUR';
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

	updateChartData(invoices: Invoice[]) {
		// 0. Calculate Available Years
		const currentYear = new Date().getFullYear();

		if (invoices.length > 0) {
			const invoiceYears = invoices.map((inv) => new Date(inv.date).getFullYear());
			const minYear = Math.min(...invoiceYears);

			// Generate continuous range from minYear to currentYear
			this.availableYears = [];
			for (let year = currentYear; year >= minYear; year--) {
				this.availableYears.push({ label: year.toString(), value: year });
			}

			// If selectedYear is not in availableYears (not possible by logic unless < minYear, but safer to check)
			const yearExists = this.availableYears.some((y) => y.value === this.selectedYear);
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
			const years = invoices.map((inv) => new Date(inv.date).getFullYear());
			const minYear = Math.min(...years);
			const maxYear = new Date().getFullYear();

			const yearlyLabels: string[] = [];
			const yearlyTotals: number[] = [];

			for (let year = minYear; year <= maxYear; year++) {
				yearlyLabels.push(year.toString());
				const total = invoices
					.filter((inv) => new Date(inv.date).getFullYear() === year)
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

		this.invoices.forEach((inv) => {
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
}
