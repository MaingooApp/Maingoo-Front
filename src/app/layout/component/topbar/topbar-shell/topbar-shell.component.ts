import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TopbarShellComponent
 * 
 * Componente contenedor que encapsula los estilos estructurales del topbar:
 * - Posicionamiento fijo en la parte superior
 * - Fondo, sombras y bordes redondeados
 * - Responsive para móvil, tablet y desktop
 * 
 * El contenido se proyecta mediante ng-content desde el componente padre.
 */
@Component({
	selector: 'app-topbar-shell',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './topbar-shell.component.html'
})
export class TopbarShellComponent { }
