import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

interface ArticleSummary {
  name: string;
}

@Component({
  selector: 'app-articles-section-header-detail',
  standalone: true,
  imports: [CommonModule, InputTextModule, IconComponent, ButtonModule, NgxPermissionsModule],
  templateUrl: './articles-section-header-detail.component.html'
})
export class ArticlesSectionHeaderDetailComponent {
  readonly P = AppPermission;

  @Input() articles: ArticleSummary[] = [];
  @Input() selectedCategory: string | null = null;

  @Output() search = new EventEmitter<Event>();
  @Output() addPreparation = new EventEmitter<void>();

  get addButtonLabel(): string {
    if (this.selectedCategory === 'elaborations') return 'Añadir elaboración';
    if (this.selectedCategory === 'articles') return 'Añadir artículo';
    return '';
  }

  onSearch(event: Event) {
    this.search.emit(event);
  }
}
