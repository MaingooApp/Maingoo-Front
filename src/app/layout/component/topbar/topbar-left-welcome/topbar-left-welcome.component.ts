import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../../service/layout.service';

/**
 * TopbarLeftWelcomeComponent
 * 
 * Componente que muestra la sección izquierda del topbar:
 * - Logotipo de Maingoo (siempre visible)
 * - Título de página en móvil (cuando está disponible)
 * - Mensaje de bienvenida con nombre de usuario y negocio
 */
@Component({
	selector: 'app-topbar-left-welcome',
	standalone: true,
	imports: [CommonModule, RouterModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './topbar-left-welcome.component.html'
})
export class TopbarLeftWelcomeComponent {
	/** Nombre del usuario autenticado */
	@Input() userName: string | undefined;

	/** Nombre del negocio/empresa */
	@Input() businessName: string = 'Tu Negocio';

	/** Tipo de negocio (Restaurante, Catering, etc.) */
	@Input() businessType: string = '';

	constructor(public layoutService: LayoutService) { }

	/** Detecta si el dispositivo es móvil */
	get isMobile(): boolean {
		return window.innerWidth < 768;
	}
}
