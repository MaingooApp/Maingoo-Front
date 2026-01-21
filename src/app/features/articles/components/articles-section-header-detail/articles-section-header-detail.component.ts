import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
	selector: 'app-articles-section-header-detail',
	standalone: true,
	imports: [CommonModule, InputTextModule, IconComponent],
	templateUrl: './articles-section-header-detail.component.html',
})
export class ArticlesSectionHeaderDetailComponent {
	@Input() articles: any[] = [];
	@Input() viewMode: 'cards' | 'list' = 'cards';

	@Output() viewModeChange = new EventEmitter<'cards' | 'list'>();
	@Output() search = new EventEmitter<Event>();

	setViewMode(mode: 'cards' | 'list') {
		this.viewModeChange.emit(mode);
	}

	onSearch(event: Event) {
		this.search.emit(event);
	}
}
