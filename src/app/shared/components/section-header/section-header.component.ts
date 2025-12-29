import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
	selector: 'app-section-header',
	standalone: true,
	imports: [CommonModule, FormsModule, InputTextModule],
	templateUrl: './section-header.component.html'
})
export class SectionHeaderComponent {
	@Input() title: string = '';
	@Input() viewMode: string = 'grid';
	@Input() gridValue: string = 'grid';
	@Input() listValue: string = 'list';
	@Input() searchPlaceholder: string = 'Buscar...';

	@Output() viewModeChange = new EventEmitter<string>();
	@Output() search = new EventEmitter<Event>();

	setViewMode(mode: string) {
		this.viewMode = mode;
		this.viewModeChange.emit(mode);
	}

	onSearch(event: Event) {
		this.search.emit(event);
	}
}
