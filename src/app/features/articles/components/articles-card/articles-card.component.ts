import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardShellComponent } from '@shared/components/card-shell/card-shell.component';
import { IconComponent } from '@shared/components/icon/icon.component';

export type ArticleCardTheme = 'orange' | 'blue' | 'purple' | 'green' | 'teal';

@Component({
  selector: 'app-articles-card',
  standalone: true,
  imports: [CommonModule, CardShellComponent, IconComponent],
  templateUrl: './articles-card.component.html'
})
export class ArticlesCardComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() theme: ArticleCardTheme = 'blue';
  @Input() isSelected: boolean = false;
  /** Etiqueta opcional que se muestra como badge (ej: 'Demo') */
  @Input() badge: string = '';

  @Output() cardClick = new EventEmitter<void>();

  get themeClasses() {
    switch (this.theme) {
      case 'orange':
        return {
          iconBg: this.isSelected ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-600',
          arrowBg: this.isSelected
            ? 'bg-orange-100 text-orange-500'
            : 'bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500'
        };
      case 'purple':
        return {
          iconBg: this.isSelected ? 'bg-purple-100 text-purple-600' : 'bg-purple-50 text-purple-600',
          arrowBg: this.isSelected
            ? 'bg-purple-100 text-purple-500'
            : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500'
        };
      case 'blue':
      default:
        return {
          iconBg: this.isSelected ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-600',
          arrowBg: this.isSelected
            ? 'bg-blue-100 text-blue-500'
            : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
        };
      case 'green':
        return {
          iconBg: this.isSelected ? 'bg-green-100 text-green-600' : 'bg-green-50 text-green-600',
          arrowBg: this.isSelected
            ? 'bg-green-100 text-green-500'
            : 'bg-gray-50 text-gray-400 group-hover:bg-green-50 group-hover:text-green-500'
        };
      case 'teal':
        return {
          iconBg: this.isSelected ? 'bg-teal-100 text-teal-600' : 'bg-teal-50 text-teal-600',
          arrowBg: this.isSelected
            ? 'bg-teal-100 text-teal-500'
            : 'bg-gray-50 text-gray-400 group-hover:bg-teal-50 group-hover:text-teal-500'
        };
    }
  }

  handleClick() {
    this.cardClick.emit();
  }
}
