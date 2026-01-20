import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-supplier-section-header-detail',
	standalone: true,
	imports: [CommonModule, ButtonModule, InputTextModule, IconComponent],
	templateUrl: './supplier-section-header-detail.component.html'
})
export class SupplierSectionHeaderDetailComponent {
	@Input() supplier: any[] = [];
	@Input() viewMode: 'grid' | 'list' = 'grid';

	@Output() viewModeChange = new EventEmitter<'grid' | 'list'>();
	@Output() search = new EventEmitter<Event>();
	@Output() addInvoice = new EventEmitter<void>();

	setViewMode(mode: 'grid' | 'list') {
		this.viewModeChange.emit(mode);
	}

	onSearch(event: Event) {
		this.search.emit(event);
	}

	onAddInvoice() {
		this.addInvoice.emit();
	}
}
