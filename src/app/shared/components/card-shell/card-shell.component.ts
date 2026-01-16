import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-card-shell',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './card-shell.component.html'
})
export class CardShellComponent {
	@Input() isSelected: boolean = false;
}
