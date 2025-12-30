import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, EmptyStateComponent],
  templateUrl: './articles.component.html',
})
export class ArticlesComponent { }
