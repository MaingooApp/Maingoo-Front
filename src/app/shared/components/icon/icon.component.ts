import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente reutilizable para iconos de Material Symbols
 * 
 * Uso:
 * <app-icon name="restaurant"></app-icon>
 * <app-icon name="home" size="lg" [filled]="true"></app-icon>
 */
@Component({
	selector: 'app-icon',
	standalone: true,
	imports: [CommonModule],
	template: `
    <span 
      class="material-symbols-outlined select-none"
      [class.text-xs]="size === 'xs'"
      [class.text-sm]="size === 'sm'"
      [class.text-base]="size === 'md'"
      [class.text-lg]="size === 'lg'"
      [class.text-xl]="size === 'xl'"
      [class.text-2xl]="size === '2xl'"
      [style.font-variation-settings]="fontVariationSettings">
      {{ name }}
    </span>
  `,
	styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class IconComponent {
	/** Nombre del icono de Material Symbols (ej: 'restaurant', 'home', 'settings') */
	@Input({ required: true }) name!: string;

	/** Tamaño del icono: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' */
	@Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md';

	/** Si el icono debe mostrarse relleno (filled) */
	@Input() filled: boolean = false;

	/** Peso del icono (100-700) */
	@Input() weight: number = 400;

	get fontVariationSettings(): string {
		return `'FILL' ${this.filled ? 1 : 0}, 'wght' ${this.weight}`;
	}
}
