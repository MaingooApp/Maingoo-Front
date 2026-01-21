import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Interfaz para los enlaces rápidos del menú
 */
export interface QuickLink {
	label: string;
	icon: string;
	route: string;
	comingSoon?: boolean;
}

/**
 * SidebarMenuComponent
 * 
 * Componente que muestra el menú de navegación rápida del sidebar:
 * - Píldoras/chips de navegación
 * - Indicador de funcionalidades "coming soon"
 * - Etiquetas de sección (Menú / Maingoo AI)
 */
@Component({
	selector: 'app-sidebar-menu',
	standalone: true,
	imports: [CommonModule, RouterModule, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './sidebar-menu.component.html'
})
export class SidebarMenuComponent {
	/** Lista de enlaces rápidos para el menú */
	@Input() quickLinks: QuickLink[] = [];
}
