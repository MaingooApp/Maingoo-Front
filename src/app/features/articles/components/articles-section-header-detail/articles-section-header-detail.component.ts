import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

@Component({
  selector: 'app-articles-section-header-detail',
  standalone: true,
  imports: [CommonModule, InputTextModule, IconComponent, ButtonModule, NgxPermissionsModule],
  templateUrl: './articles-section-header-detail.component.html'
})
export class ArticlesSectionHeaderDetailComponent {
  readonly P = AppPermission;

  @Input() articles: any[] = [];
  @Input() viewMode: 'cards' | 'list' = 'cards';
  @Input() selectedCategory: string | null = null;

  @Output() viewModeChange = new EventEmitter<'cards' | 'list'>();
  @Output() search = new EventEmitter<Event>();
  @Output() addPreparation = new EventEmitter<void>();

  get addButtonLabel(): string {
    if (this.selectedCategory === 'elaborations') return 'Añadir elaboración';
    if (this.selectedCategory === 'articles') return 'Añadir artículo';
    return '';
  }

  setViewMode(mode: 'cards' | 'list') {
    this.viewModeChange.emit(mode);
  }

  onSearch(event: Event) {
    this.search.emit(event);
  }
}
