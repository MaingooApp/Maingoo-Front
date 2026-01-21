import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SidebarShellComponent
 * 
 * Componente contenedor que encapsula los estilos estructurales del sidebar:
 * - Flexbox vertical con overflow controlado
 * - Estilos visuales del contenedor
 * - Soporte para estilos dinámicos via @Input
 * 
 * El contenido se proyecta mediante ng-content desde el componente padre.
 */
@Component({
	selector: 'app-sidebar-shell',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './sidebar-shell.component.html'
})
export class SidebarShellComponent {
	/** Estilos dinámicos para el contenedor (posición, altura, etc.) */
	@Input() shellStyle: { [key: string]: string | undefined } = {};
}
