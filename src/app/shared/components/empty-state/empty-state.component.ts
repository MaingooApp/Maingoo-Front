import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-empty-state',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './empty-state.component.html',
	styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
	@Input() title: string = '';
	@Input() description: string = '';
	@Input() icon: string = '';
	@Input() iconSize: string = '6rem';
}
