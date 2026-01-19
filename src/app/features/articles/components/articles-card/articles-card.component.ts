import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardShellComponent } from '@shared/components/card-shell/card-shell.component';
import { IconComponent } from '@shared/components/icon/icon.component';

export type ArticleCardTheme = 'orange' | 'blue' | 'purple';

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

	@Output() cardClick = new EventEmitter<void>();

	get themeClasses() {
		switch (this.theme) {
			case 'orange':
				return {
					iconBg: this.isSelected ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-600',
					arrowBg: this.isSelected ? 'bg-orange-100 text-orange-500' : 'bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500'
				};
			case 'purple':
				return {
					iconBg: this.isSelected ? 'bg-purple-100 text-purple-600' : 'bg-purple-50 text-purple-600',
					arrowBg: this.isSelected ? 'bg-purple-100 text-purple-500' : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500'
				};
			case 'blue':
			default:
				return {
					iconBg: this.isSelected ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-600',
					arrowBg: this.isSelected ? 'bg-blue-100 text-blue-500' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
				};
		}
	}

	handleClick() {
		this.cardClick.emit();
	}
}
