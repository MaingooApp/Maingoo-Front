import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
	selector: 'app-empty-state',
	standalone: true,
	imports: [CommonModule, IconComponent],
	templateUrl: './empty-state.component.html',
	styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
	@Input() title: string = '';
	@Input() description: string = '';
	@Input() icon: string = '';
	@Input() iconSize: string = '6rem';
	@Input() showComingSoon: boolean = false;
}
