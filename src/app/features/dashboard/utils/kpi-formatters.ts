/**
 * Helpers de formateo para valores de KPI
 * Usa Intl.NumberFormat con locale es-ES para consistencia
 */

/**
 * Formatea un número como moneda EUR
 * @example formatCurrencyEUR(1234.56) => "1.234,56"
 */
export function formatCurrencyEUR(value: number): string {
	return new Intl.NumberFormat('es-ES', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
}

/**
 * Formatea un número entero con separadores de miles
 * @example formatNumber(12345) => "12.345"
 */
export function formatNumber(value: number): string {
	return new Intl.NumberFormat('es-ES', {
		maximumFractionDigits: 0
	}).format(value);
}

/**
 * Formatea un porcentaje con 1 decimal
 * @example formatPercent1(12.345) => "12,3"
 */
export function formatPercent1(value: number): string {
	return new Intl.NumberFormat('es-ES', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value);
}

/**
 * Formatea un valor según el tipo especificado
 */
export function formatKpiValue(
	value: string | number,
	formatter?: 'number' | 'currencyEUR' | 'percent1' | 'text'
): string {
	if (typeof value === 'string') return value;

	switch (formatter) {
		case 'currencyEUR':
			return formatCurrencyEUR(value);
		case 'percent1':
			return formatPercent1(value);
		case 'number':
			return formatNumber(value);
		case 'text':
		default:
			return String(value);
	}
}

/**
 * Formatea el delta de variación con signo
 * @example formatDelta(12.5, 'percent1') => "+12,5"
 */
export function formatDelta(
	delta: number,
	formatter?: 'percent1' | 'number'
): string {
	const prefix = delta > 0 ? '+' : '';
	const formatted = formatter === 'percent1'
		? formatPercent1(delta)
		: formatNumber(delta);
	return prefix + formatted;
}
