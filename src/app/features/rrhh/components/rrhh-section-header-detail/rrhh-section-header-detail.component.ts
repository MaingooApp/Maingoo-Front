import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-rrhh-section-header-detail',
	standalone: true,
	imports: [CommonModule, ButtonModule, InputTextModule, IconComponent],
	templateUrl: './rrhh-section-header-detail.component.html',
})
export class RrhhSectionHeaderDetailComponent {
	@Input() viewMode: 'cards' | 'list' = 'cards';

	@Output() viewModeChange = new EventEmitter<'cards' | 'list'>();
	@Output() search = new EventEmitter<Event>();
	@Output() addEmployee = new EventEmitter<void>();

	setViewMode(mode: 'cards' | 'list') {
		this.viewModeChange.emit(mode);
	}

	onSearch(event: Event) {
		this.search.emit(event);
	}

	onAddEmployee() {
		this.addEmployee.emit();
	}
}
