import { Component, inject, OnInit, OnDestroy, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { IconComponent } from '@shared/components/icon/icon.component';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { RrhhSectionHeaderDetailComponent } from './components/rrhh-section-header-detail/rrhh-section-header-detail.component';

export interface Employee {
	id: string;
	name: string;
	role: string;
	department: string;
	email: string;
	phone: string;
	status: 'active' | 'on_leave' | 'inactive';
	joinDate: Date;
	avatar?: string;
}

@Component({
	selector: 'app-rrhh',
	standalone: true,
	imports: [
		CommonModule,
		EmptyStateComponent,
		TableModule,
		ButtonModule,
		TagModule,
		AvatarModule,
		InputTextModule,
		IconFieldModule,
		InputIconModule,
		TooltipModule,
		RrhhSectionHeaderDetailComponent
	],
	templateUrl: './rrhh.component.html',
})
export class RrhhComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('headerTpl') headerTpl!: TemplateRef<any>;
	private headerService = inject(SectionHeaderService);

	viewMode: 'list' | 'cards' = 'list';
	employees: Employee[] = [];
	filteredEmployees: Employee[] = [];

	ngOnInit() {
		// Initialize data
	}

	ngAfterViewInit() {
		setTimeout(() => {
			this.headerService.setContent(this.headerTpl);
		});
	}

	ngOnDestroy() {
		this.headerService.reset();
	}

	// Since we don't have a constructor or lifecycle hooks yet setup for data loading (mock data was inline),
	// and the mock data was removed, we just start with empty. 
	// If employees had data, we would init filteredEmployees along with it.

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value.toLowerCase();
		this.filteredEmployees = this.employees.filter(emp =>
			emp.name.toLowerCase().includes(query) ||
			emp.role.toLowerCase().includes(query) ||
			emp.department.toLowerCase().includes(query) ||
			emp.email.toLowerCase().includes(query)
		);
	}

	kpis = [
		{ label: 'Total Empleados', value: 0, icon: 'pi pi-users', color: 'text-blue-500', bg: 'bg-blue-50' },
		{ label: 'Activos', value: 0, icon: 'pi pi-check-circle', color: 'text-green-500', bg: 'bg-green-50' },
		{ label: 'Ausentes', value: 0, icon: 'pi pi-calendar-minus', color: 'text-orange-500', bg: 'bg-orange-50' }
	];

	getSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
		switch (status) {
			case 'active':
				return 'success';
			case 'on_leave':
				return 'warning';
			case 'inactive':
				return 'danger';
			default:
				return 'info';
		}
	}

	getStatusLabel(status: string): string {
		switch (status) {
			case 'active': return 'Activo';
			case 'on_leave': return 'De Baja';
			case 'inactive': return 'Inactivo';
			default: return status;
		}
	}
}
