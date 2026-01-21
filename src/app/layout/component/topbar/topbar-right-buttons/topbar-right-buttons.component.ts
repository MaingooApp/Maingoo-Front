import { Component, ChangeDetectionStrategy, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { IconComponent } from '@shared/components/icon/icon.component';
import { LayoutService } from '../../../service/layout.service';

/**
 * TopbarRightButtonsComponent
 * 
 * Componente que contiene los botones de acción del topbar:
 * - Menú IA (toggle sidebar)
 * - Mi Perfil (navegar)
 * - Tema claro/oscuro
 * - Cerrar sesión
 */
@Component({
	selector: 'app-topbar-right-buttons',
	standalone: true,
	imports: [CommonModule, RouterModule, RippleModule, TooltipModule, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './topbar-right-buttons.component.html'
})
export class TopbarRightButtonsComponent {
	layoutService = inject(LayoutService);

	/** Evento para toggle del menú/sidebar */
	@Output() menuToggle = new EventEmitter<void>();

	/** Evento para toggle del tema */
	@Output() themeToggle = new EventEmitter<void>();

	/** Evento para cerrar sesión */
	@Output() logoutClick = new EventEmitter<void>();

	/**
	 * Alterna la visibilidad del sidebar
	 */
	onMenuToggle(): void {
		this.layoutService.onMenuToggle();
		this.menuToggle.emit();
	}

	/**
	 * Alterna entre tema claro y oscuro
	 */
	toggleDarkMode(): void {
		this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
		this.themeToggle.emit();
	}

	/**
	 * Emite evento de logout
	 */
	logout(): void {
		this.logoutClick.emit();
	}
}
