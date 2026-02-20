/**
 * Interfaces para el componente KPI Slot con Slides
 * Modelo de datos para representar slots de métricas con carrusel interno
 */

/**
 * Acción del CTA de una slide
 */
export type KpiSlideAction =
	| { type: 'navigate'; target: string }
	| { type: 'emit'; key: string };

/**
 * Representa una slide individual dentro de un KPI Slot
 */
export interface KpiSlideVM {
	/** Identificador único de la slide */
	id: string;
	/** Etiqueta descriptiva (ej: "Facturas hoy") */
	label: string;
	/** Valor a mostrar (número o texto) */
	value: string | number;
	/** Tipo de formato para el valor */
	valueFormatter?: 'number' | 'currencyEUR' | 'percent1' | 'text';
	/** Sufijo opcional después del valor */
	suffix?: string;
	/** Variación respecto al período anterior */
	delta?: number;
	/** Formato del delta */
	deltaFormatter?: 'percent1' | 'number';
	/** Estado visual de severidad */
	severity?: 'neutral' | 'ok' | 'warn' | 'danger';
	/** Tooltip con información adicional */
	tooltip?: string;
	/** Texto del botón de acción (opcional) */
	ctaLabel?: string;
	/** Acción al hacer click en el CTA */
	ctaAction?: KpiSlideAction;
	/** Si la slide es visible (para filtrado condicional) */
	visible?: boolean;
}

/**
 * Representa un KPI Slot completo con sus slides
 */
export interface KpiSlotVM {
	/** Identificador único del slot */
	id: string;
	/** Título del slot (ej: "Actividad") */
	title: string;
	/** Array de slides del carrusel */
	slides: KpiSlideVM[];
	/** Habilitar rotación automática */
	autoRotate?: boolean;
	/** Intervalo de rotación en ms (default: 5000) */
	rotateMs?: number;
	/** Tiempo de pausa tras interacción en ms (default: 10000) */
	pauseAfterInteractionMs?: number;
	/** Estado de carga */
	loading?: boolean;
	/** Error si lo hay */
	error?: { message: string };
	/** Indica si los datos son mock/falsos */
	isMock?: boolean;
}

/**
 * Evento emitido al hacer click en un slot/slide
 */
export interface KpiSlotClickEvent {
	slotId: string;
	slideId: string;
}

/**
 * Evento emitido al cambiar de slide
 */
export interface KpiSlideChangeEvent {
	slotId: string;
	fromSlideId: string | null;
	toSlideId: string;
	reason: 'auto' | 'manual' | 'init';
}
