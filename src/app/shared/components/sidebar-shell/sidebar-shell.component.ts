import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
	selector: 'app-sidebar-shell',
	standalone: true,
	imports: [CommonModule, IconComponent],
	templateUrl: './sidebar-shell.component.html',
})
export class SidebarShellComponent {
	/**
	 * Title to display in the header
	 */
	@Input() title: string = '';

	/**
	 * Optional boolean to show a loading state (e.g. storage change)
	 */
	@Input() loading: boolean = false;

	/**
	 * Emitted when the user clicks the close button
	 */
	@Output() close = new EventEmitter<void>();
}
