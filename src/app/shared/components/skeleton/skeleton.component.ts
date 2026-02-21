import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * SkeletonComponent - Componente unificado para estados de carga
 * 
 * Soporta 3 modos:
 * - 'single': Skeleton individual personalizable
 * - 'grid': Grid de tarjetas skeleton (N tarjetas)
 * - 'list': Lista de filas skeleton (N filas)
 */
@Component({
	selector: 'app-skeleton',
	standalone: true,
	imports: [CommonModule, SkeletonModule],
	template: `
    <!-- MODO: Single (elemento individual) -->
    <p-skeleton
      *ngIf="mode === 'single'"
      [width]="width!"
      [height]="height!"
      [shape]="shape"
      [size]="size!"
      [borderRadius]="borderRadius!"
      [styleClass]="styleClass!"
      [animation]="animation">
    </p-skeleton>

    <!-- MODO: Grid (tarjetas) -->
    <div *ngIf="mode === 'grid'" class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <div
        *ngFor="let i of items"
        class="rounded-content overflow-hidden shadow-sm bg-white p-4 flex flex-col gap-3 min-h-[180px]"
      >
        <!-- Header -->
        <div class="flex flex-col gap-2">
          <p-skeleton width="70%" height="1.25rem"></p-skeleton>
          <p-skeleton width="40%" height="0.75rem"></p-skeleton>
        </div>

        <!-- Details -->
        <div class="mt-auto flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <p-skeleton shape="circle" size="1rem"></p-skeleton>
            <p-skeleton width="60%" height="0.875rem"></p-skeleton>
          </div>
          <div class="flex items-center gap-2">
            <p-skeleton shape="circle" size="1rem"></p-skeleton>
            <p-skeleton width="50%" height="0.875rem"></p-skeleton>
          </div>
          <div class="flex items-center gap-2">
            <p-skeleton shape="circle" size="1rem"></p-skeleton>
            <p-skeleton width="45%" height="0.875rem"></p-skeleton>
          </div>
        </div>
      </div>
    </div>

    <!-- MODO: List (filas) -->
    <div *ngIf="mode === 'list'" class="rounded-content shadow-sm overflow-hidden bg-white">
      <div
        *ngFor="let i of items"
        class="border-b border-gray-100 last:border-0 p-4 flex items-center gap-4"
      >
        <!-- Avatar/Icon -->
        <p-skeleton shape="circle" size="2.5rem"></p-skeleton>

        <!-- Content -->
        <div class="flex-1 flex flex-col gap-2">
          <p-skeleton width="50%" height="1rem"></p-skeleton>
          <p-skeleton width="30%" height="0.75rem"></p-skeleton>
        </div>

        <!-- Action Icon -->
        <p-skeleton width="1rem" height="1rem"></p-skeleton>
      </div>
    </div>
  `,
	styles: []
})
export class SkeletonComponent {
	/**
	 * Modo del skeleton
	 * @default 'single'
	 */
	@Input() mode: 'single' | 'grid' | 'list' = 'single';

	/**
	 * Número de items (solo para mode='grid' o mode='list')
	 * @default 8 para grid, 6 para list
	 */
	@Input() count?: number;

	/**
	 * Ancho del skeleton (solo para mode='single')
	 * @default undefined (100% del contenedor)
	 */
	@Input() width?: string;

	/**
	 * Alto del skeleton (solo para mode='single')
	 * @default undefined
	 */
	@Input() height?: string;

	/**
	 * Forma del skeleton (solo para mode='single')
	 * @default 'rectangle'
	 */
	@Input() shape: 'rectangle' | 'circle' = 'rectangle';

	/**
	 * Tamaño del skeleton (solo para mode='single' y shape='circle')
	 * @default undefined
	 */
	@Input() size?: string;

	/**
	 * Border radius personalizado (solo para mode='single')
	 * @default undefined
	 */
	@Input() borderRadius?: string;

	/**
	 * Clases CSS adicionales (solo para mode='single')
	 * @default undefined
	 */
	@Input() styleClass?: string;

	/**
	 * Tipo de animación
	 * @default 'wave'
	 */
	@Input() animation: 'wave' | 'none' = 'wave';

	/**
	 * Array auxiliar para *ngFor en modos grid/list
	 */
	get items(): number[] {
		const defaultCount = this.mode === 'grid' ? 8 : 6;
		const itemCount = this.count ?? defaultCount;
		return Array.from({ length: itemCount }, (_, i) => i + 1);
	}
}
