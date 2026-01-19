import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

@Component({
	selector: 'app-articles-content',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		InputTextModule,
		DropdownModule
	],
	templateUrl: './articles-content.component.html'
})
export class ArticlesContentComponent {
	@Input() showForm: boolean = false;
	@Output() limitForm = new EventEmitter<boolean>();

	newArticleName = signal<string>('');
	newArticleType = signal<any>(null);

	articleTypes = [
		{ label: 'Aperitivo', value: 'aperitivo' },
		{ label: 'Entrante', value: 'entrante' },
		{ label: 'Principal', value: 'principal' },
		{ label: 'Postre', value: 'postre' },
		{ label: 'Bebida', value: 'bebida' }
	];

	cancelForm() {
		this.newArticleName.set('');
		this.newArticleType.set(null);
		this.limitForm.emit(false);
	}

	save() {
		// Implement save logic or emit event
		console.log('Saving article:', this.newArticleName(), this.newArticleType());
		this.cancelForm();
	}
}
