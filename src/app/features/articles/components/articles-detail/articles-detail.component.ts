import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetailCardShellComponent } from '@shared/components/detail-card-shell/detail-card-shell.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { Product } from '@app/core/interfaces/Invoice.interfaces';
import { PreparationsContentComponent } from '../preparations-content/preparations-content.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '@app/core/constants/permissions.enum';

@Component({
  selector: 'app-articles-detail',
  standalone: true,
  imports: [
    CommonModule,
    DetailCardShellComponent,
    IconComponent,
    ButtonModule,
    PreparationsContentComponent,
    NgxPermissionsModule
  ],
  templateUrl: './articles-detail.component.html'
})
export class ArticlesDetailComponent {
  readonly P = AppPermission;
  @Input() selectedCategory: string | null = null;
  @Input() availableProducts: Product[] = [];
  @Output() close = new EventEmitter<void>();

  @ViewChild('preparationsComponent') preparationsComponent?: PreparationsContentComponent;

  get shellTitle(): string {
    const prep = this.preparationsComponent?.selectedPreparation();
    if (prep) return prep.name;
    if (this.preparationsComponent?.isEditMode()) {
      return this.preparationsComponent.type === 'elaboration' ? 'Nueva elaboración' : 'Nuevo artículo';
    }
    return this.categoryDisplayName;
  }

  get categoryDisplayName(): string {
    if (!this.selectedCategory) return '';
    const names: Record<string, string> = {
      elaborations: 'Elaboraciones',
      articles: 'Artículos',
      'mise-en-place': 'Mise en place'
    };
    return names[this.selectedCategory] ?? this.selectedCategory;
  }

  onAddPreparation() {
    this.preparationsComponent?.startCreate();
  }

  onDeletePreparation() {
    const prep = this.preparationsComponent?.selectedPreparation();
    if (prep) {
      this.preparationsComponent?.deletePreparation(prep);
    }
  }

  onClose() {
    if (this.preparationsComponent?.isShellOpen) {
      this.preparationsComponent.closeDetail();
      return;
    }
    this.close.emit();
  }
}
