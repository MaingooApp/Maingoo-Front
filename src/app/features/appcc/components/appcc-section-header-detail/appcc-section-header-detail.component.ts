import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-appcc-section-header-detail',
	standalone: true,
	imports: [CommonModule, IconComponent],
	templateUrl: './appcc-section-header-detail.component.html',
})
export class AppccSectionHeaderDetailComponent {
	@Input() viewMode: 'cards' | 'list' = 'cards';
	@Output() viewModeChange = new EventEmitter<'cards' | 'list'>();

	setViewMode(mode: 'cards' | 'list') {
		this.viewModeChange.emit(mode);
	}
}
