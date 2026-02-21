import {
	Component,
	Input,
	Output,
	EventEmitter,
	OnInit,
	OnDestroy,
	OnChanges,
	SimpleChanges,
	ChangeDetectionStrategy,
	signal,
	computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import {
	KpiSlotVM,
	KpiSlideVM,
	KpiSlotClickEvent,
	KpiSlideChangeEvent
} from '../../interfaces/kpi-slot.interfaces';
import { formatKpiValue, formatDelta } from '../../utils/kpi-formatters';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

/**
 * Componente reutilizable KPI Slot con carrusel de slides
 * Soporta rotación automática, navegación manual, y estados loading/error/empty
 */
@Component({
	selector: 'app-kpi-slot',
	standalone: true,
	imports: [CommonModule, SkeletonModule, TooltipModule, ButtonModule, SkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
    <!-- Container principal del slot -->
    <div 
      class="bg-white rounded-content shadow-sm border border-gray-100 overflow-hidden 
             hover:shadow-md hover:border-gray-200 transition-all duration-200
             min-w-[280px] max-w-[340px]"
      [attr.aria-label]="getSlotAriaLabel()"
      role="region">
      
      <!-- Header del slot -->
      <div class="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-maingoo-deep m-0">{{ slot?.title || 'Cargando...' }}</h3>
          <!-- Badge indicador de datos mock -->
          <span *ngIf="slot?.isMock" class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-amber-600 uppercase tracking-wide">False data | No Backend</span>
        </div>
        
        <!-- Indicador de slides (dots) - solo si hay más de 1 slide -->
        <div *ngIf="visibleSlides().length > 1" class="flex items-center gap-1.5">
          <button 
            *ngFor="let slide of visibleSlides(); let i = index"
            (click)="goToSlide(i, 'manual')"
            [attr.aria-label]="'Ir a ' + slide.label"
            class="w-1.5 h-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-maingoo-sage focus:ring-offset-1"
            [ngClass]="currentIndex() === i 
              ? 'bg-maingoo-sage w-3' 
              : 'bg-gray-300 hover:bg-gray-400'">
          </button>
        </div>
      </div>

      <!-- Estado: Loading -->
      <div *ngIf="slot?.loading" class="p-4">
        <app-skeleton height="2.5rem" styleClass="mb-2"></app-skeleton>
        <app-skeleton width="60%" height="1rem"></app-skeleton>
      </div>

      <!-- Estado: Error -->
      <div *ngIf="slot?.error && !slot?.loading" class="p-4">
        <div class="flex items-center gap-2 text-red-600 mb-2">
          <span class="material-symbols-outlined text-base">error</span>
          <span class="text-sm">{{ slot?.error?.message }}</span>
        </div>
        <button 
          pButton 
          label="Reintentar" 
          icon="refresh"
          class="p-button-sm p-button-text p-button-secondary"
          (click)="onRetryClick()">
        </button>
      </div>

      <!-- Estado: Empty -->
      <div *ngIf="!slot?.loading && !slot?.error && visibleSlides().length === 0" class="p-4">
        <p class="text-gray-400 text-sm text-center m-0">Sin datos disponibles</p>
      </div>

      <!-- Estado: OK - Contenido de slides -->
      <div 
        *ngIf="!slot?.loading && !slot?.error && visibleSlides().length > 0"
        class="relative overflow-hidden">
        
        <!-- Slide actual -->
        <div
          *ngIf="currentSlide() as slide"
          (mouseenter)="pauseRotation()"
          (mouseleave)="resumeRotation()"
          [attr.aria-label]="getSlideAriaLabel(slide)"
          class="w-full p-4 text-left bg-white">
          
          <!-- Contenido de la slide -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <!-- Valor principal -->
              <div class="flex items-baseline gap-1 mb-1">
                <span 
                  class="text-2xl font-bold"
                  [ngClass]="getValueClasses(slide.severity)">
                  {{ formatValue(slide.value, slide.valueFormatter) }}
                </span>
                <span *ngIf="slide.suffix" class="text-sm text-gray-400 font-medium">
                  {{ slide.suffix }}
                </span>
              </div>
              
              <!-- Label -->
              <p class="text-xs text-gray-500 m-0 truncate">{{ slide.label }}</p>
            </div>

            <!-- Delta badge -->
            <div *ngIf="slide.delta !== undefined" class="shrink-0">
              <span 
                [ngClass]="getDeltaClasses(slide.delta, slide.severity)"
                class="text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1">
                <i [class]="getDeltaIcon(slide.delta)" class="text-[10px]"></i>
                {{ formatDeltaValue(slide.delta, slide.deltaFormatter) }}%
              </span>
            </div>
          </div>

          <!-- Indicador de severidad (línea lateral) -->
          <div 
            [ngClass]="getSeverityLineClasses(slide.severity)"
            class="absolute left-0 top-0 bottom-0 w-1 transition-opacity"
            [class.opacity-100]="slide.severity && slide.severity !== 'neutral'"
            [class.opacity-0]="!slide.severity || slide.severity === 'neutral'">
          </div>
        </div>

        <!-- Controles prev/next - solo si hay más de 1 slide -->
        <div 
          *ngIf="visibleSlides().length > 1"
          class="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-1">
          <button
            (click)="prevSlide(); $event.stopPropagation()"
            (mouseenter)="pauseRotation()"
            aria-label="Slide anterior"
            class="pointer-events-auto w-6 h-6 rounded-full bg-white/80 hover:bg-white 
                   shadow-sm border border-gray-200 flex items-center justify-center
                   text-gray-400 hover:text-maingoo-deep transition-all
                   focus:outline-none focus:ring-2 focus:ring-maingoo-sage opacity-0 group-hover:opacity-100">
            <span class="material-symbols-outlined text-xs">chevron_left</span>
          </button>
          <button
            (click)="nextSlide(); $event.stopPropagation()"
            (mouseenter)="pauseRotation()"
            aria-label="Siguiente slide"
            class="pointer-events-auto w-6 h-6 rounded-full bg-white/80 hover:bg-white 
                   shadow-sm border border-gray-200 flex items-center justify-center
                   text-gray-400 hover:text-maingoo-deep transition-all
                   focus:outline-none focus:ring-2 focus:ring-maingoo-sage opacity-0 group-hover:opacity-100">
            <span class="material-symbols-outlined text-xs">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  `,
	styles: [`
    :host {
      display: block;
    }
  `]
})
export class KpiSlotComponent implements OnInit, OnDestroy, OnChanges {
	/** Datos del slot - signal interno */
	private _slot = signal<KpiSlotVM | null>(null);

	/** Setter del Input que actualiza el signal */
	@Input()
	set slot(value: KpiSlotVM | null) {
		this._slot.set(value);
	}
	get slot(): KpiSlotVM | null {
		return this._slot();
	}

	/** Evento al hacer click en el slot/slide */
	@Output() slotClick = new EventEmitter<KpiSlotClickEvent>();

	/** Evento al cambiar de slide */
	@Output() slideChange = new EventEmitter<KpiSlideChangeEvent>();

	/** Evento para reintentar tras error */
	@Output() retry = new EventEmitter<void>();

	// Estado interno
	currentIndex = signal(0);
	private autoRotateInterval: ReturnType<typeof setInterval> | null = null;
	private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
	private isPaused = false;

	// Computed: slides visibles (filtradas por visible !== false)
	visibleSlides = computed(() => {
		const slot = this._slot();
		if (!slot?.slides) return [];
		return slot.slides.filter(s => s.visible !== false);
	});

	// Computed: slide actual
	currentSlide = computed(() => {
		const slides = this.visibleSlides();
		const idx = this.currentIndex();
		return slides[idx] || null;
	});

	ngOnInit(): void {
		this.initializeSlot();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['slot'] && !changes['slot'].firstChange) {
			this.initializeSlot();
		}
	}

	ngOnDestroy(): void {
		this.stopAutoRotate();
		this.clearPauseTimeout();
	}

	/**
	 * Inicializa el slot: determina slide inicial y configura autorotate
	 */
	private initializeSlot(): void {
		if (!this.slot) return;

		this.stopAutoRotate();

		const slides = this.visibleSlides();
		if (slides.length === 0) return;

		// Priorizar slide con severity warn/danger
		const priorityIndex = slides.findIndex(
			s => s.severity === 'danger' || s.severity === 'warn'
		);
		const initialIndex = priorityIndex >= 0 ? priorityIndex : 0;

		const previousSlide = this.currentSlide();
		this.currentIndex.set(initialIndex);

		// Emitir evento de cambio inicial
		this.slideChange.emit({
			slotId: this.slot.id,
			fromSlideId: previousSlide?.id || null,
			toSlideId: slides[initialIndex].id,
			reason: 'init'
		});

		// Iniciar auto-rotate si está habilitado y hay más de 1 slide
		if (this.slot.autoRotate && slides.length > 1) {
			this.startAutoRotate();
		}
	}

	/**
	 * Inicia la rotación automática
	 */
	private startAutoRotate(): void {
		if (this.autoRotateInterval) return;

		const interval = this.slot?.rotateMs || 5000;
		this.autoRotateInterval = setInterval(() => {
			if (!this.isPaused) {
				this.nextSlide('auto');
			}
		}, interval);
	}

	/**
	 * Detiene la rotación automática
	 */
	private stopAutoRotate(): void {
		if (this.autoRotateInterval) {
			clearInterval(this.autoRotateInterval);
			this.autoRotateInterval = null;
		}
	}

	/**
	 * Pausa la rotación temporalmente (tras interacción del usuario)
	 */
	pauseRotation(): void {
		this.isPaused = true;
		this.clearPauseTimeout();
	}

	/**
	 * Reanuda la rotación después del tiempo de pausa
	 */
	resumeRotation(): void {
		this.clearPauseTimeout();

		const pauseDuration = this.slot?.pauseAfterInteractionMs || 10000;
		this.pauseTimeout = setTimeout(() => {
			this.isPaused = false;
		}, pauseDuration);
	}

	private clearPauseTimeout(): void {
		if (this.pauseTimeout) {
			clearTimeout(this.pauseTimeout);
			this.pauseTimeout = null;
		}
	}

	/**
	 * Navega a una slide específica
	 */
	goToSlide(index: number, reason: 'auto' | 'manual'): void {
		const slides = this.visibleSlides();
		if (index < 0 || index >= slides.length) return;

		const fromSlide = this.currentSlide();
		this.currentIndex.set(index);

		this.slideChange.emit({
			slotId: this.slot?.id || '',
			fromSlideId: fromSlide?.id || null,
			toSlideId: slides[index].id,
			reason
		});

		if (reason === 'manual') {
			this.pauseRotation();
			this.resumeRotation();
		}
	}

	/**
	 * Navega a la slide anterior
	 */
	prevSlide(reason: 'auto' | 'manual' = 'manual'): void {
		const slides = this.visibleSlides();
		const newIndex = this.currentIndex() === 0
			? slides.length - 1
			: this.currentIndex() - 1;
		this.goToSlide(newIndex, reason);
	}

	/**
	 * Navega a la siguiente slide
	 */
	nextSlide(reason: 'auto' | 'manual' = 'manual'): void {
		const slides = this.visibleSlides();
		const newIndex = (this.currentIndex() + 1) % slides.length;
		this.goToSlide(newIndex, reason);
	}

	/**
	 * Handler para click en una slide
	 */
	onSlideClick(slide: KpiSlideVM): void {
		this.slotClick.emit({
			slotId: this.slot?.id || '',
			slideId: slide.id
		});
	}

	/**
	 * Handler para retry
	 */
	onRetryClick(): void {
		this.retry.emit();
	}

	// === Formatters ===

	formatValue(value: string | number, formatter?: 'number' | 'currencyEUR' | 'percent1' | 'text'): string {
		return formatKpiValue(value, formatter);
	}

	formatDeltaValue(delta: number, formatter?: 'percent1' | 'number'): string {
		return formatDelta(delta, formatter || 'percent1');
	}

	// === Clases CSS ===

	getValueClasses(severity?: string): string {
		switch (severity) {
			case 'ok': return 'text-green-600 group-hover:text-green-700';
			case 'warn': return 'text-amber-600 group-hover:text-amber-700';
			case 'danger': return 'text-red-600 group-hover:text-red-700';
			default: return 'text-maingoo-deep group-hover:text-maingoo-sage';
		}
	}

	getDeltaClasses(delta: number, severity?: string): string {
		// Para errores, delta negativo es bueno
		if (severity === 'danger') {
			return delta < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
		}
		return delta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
	}

	getDeltaIcon(delta: number): string {
		if (delta > 0) return 'arrow_upward';
		if (delta < 0) return 'arrow_downward';
		return 'remove';
	}

	getSeverityLineClasses(severity?: string): string {
		switch (severity) {
			case 'ok': return 'bg-green-500';
			case 'warn': return 'bg-amber-500';
			case 'danger': return 'bg-red-500';
			default: return 'bg-transparent';
		}
	}

	// === Accesibilidad ===

	getSlotAriaLabel(): string {
		return `Panel de ${this.slot?.title || 'métricas'}`;
	}

	getSlideAriaLabel(slide: KpiSlideVM): string {
		const value = this.formatValue(slide.value, slide.valueFormatter);
		return `${slide.label}: ${value}${slide.suffix || ''}`;
	}
}
