import { Component, EventEmitter, Input, Output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DetailCardShellComponent } from '@shared/components/detail-card-shell/detail-card-shell.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { ElaborationsContentComponent, IngredientRow } from '../elaborations-content/elaborations-content.component';
import { ArticlesContentComponent } from '../articles-content/articles-content.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

@Component({
  selector: 'app-articles-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DetailCardShellComponent,
    IconComponent,
    ButtonModule,
    ElaborationsContentComponent,
    ArticlesContentComponent,
    NgxPermissionsModule
  ],
  templateUrl: './articles-detail.component.html'
})
export class ArticlesDetailComponent implements OnInit {
  readonly P = AppPermission;
  @Input() selectedCategory: string | null = null;
  @Input() availableProducts: Product[] = [];
  @Input() articles: { name: string }[] = [];
  @Output() close = new EventEmitter<void>();

  // Local state for created elaborations
  elaborations = signal<{ name: string; ingredients: IngredientRow[]; materials: string; steps: string }[]>([]);

  // Form State controlled from here
  showAddArticleForm = signal<boolean>(false);
  showAddElaborationForm = signal<boolean>(false);

  ngOnInit() {}

  get categoryDisplayName(): string {
    if (!this.selectedCategory) return '';
    const names: Record<string, string> = {
      elaborations: 'Elaboraciones',
      articles: 'Artículos',
      'mise-en-place': 'Mise en place'
    };
    return names[this.selectedCategory] ?? this.selectedCategory;
  }

  get isHelper(): boolean {
    return this.selectedCategory === 'mise-en-place';
  }

  toggleAddArticleForm() {
    this.showAddArticleForm.update((v) => !v);
  }

  onEdit() {
    // Implement edit logic
    console.log('Edit category');
  }

  toggleAddElaborationForm() {
    this.showAddElaborationForm.update((v) => !v);
  }

  onLimitArticleForm(value: boolean) {
    this.showAddArticleForm.set(value);
  }

  onLimitElaborationForm(value: boolean) {
    this.showAddElaborationForm.set(value);
  }

  onSaveElaboration(elaboration: any) {
    this.elaborations.update((current) => [...current, elaboration]);
    this.showAddElaborationForm.set(false);
  }

  onClose() {
    this.showAddArticleForm.set(false);
    this.showAddElaborationForm.set(false);
    this.close.emit();
  }
}
