import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { KpiSlotVM } from '../interfaces/kpi-slot.interfaces';

/**
 * Servicio mock para obtener datos de KPI Slots
 * TODO: Reemplazar con llamadas reales al backend
 */
@Injectable({ providedIn: 'root' })
export class DashboardKpiSlotMockService {

	/**
	 * Obtiene el slot de "Actividad" con datos de ejemplo
	 * Incluye delay para simular latencia de red
	 */
	getActividadSlot$(): Observable<KpiSlotVM> {
		const slot: KpiSlotVM = {
			id: 'actividad',
			title: 'Actividad',
			autoRotate: true,
			rotateMs: 5000,
			pauseAfterInteractionMs: 10000,
			slides: [
				{
					id: 'facturas-hoy',
					label: 'Facturas procesadas hoy',
					value: 23,
					valueFormatter: 'number',
					severity: 'neutral',
					tooltip: 'Facturas procesadas en las últimas 24h',
					visible: true
				},
				{
					id: 'importe-procesado',
					label: 'Importe facturas hoy',
					value: 4580.50,
					valueFormatter: 'currencyEUR',
					suffix: '€',
					severity: 'neutral',
					tooltip: 'Total facturado procesado hoy',
					visible: true
				}
			]
		};

		// Simula delay de red (300-600ms)
		const randomDelay = Math.floor(Math.random() * 300) + 300;
		return of(slot).pipe(delay(randomDelay));
	}

	/**
	 * Versión que simula un estado de loading
	 */
	getActividadSlotLoading$(): Observable<KpiSlotVM> {
		const slot: KpiSlotVM = {
			id: 'actividad',
			title: 'Actividad',
			slides: [],
			loading: true
		};
		return of(slot);
	}

	/**
	 * Versión que simula un error
	 */
	getActividadSlotError$(): Observable<KpiSlotVM> {
		const slot: KpiSlotVM = {
			id: 'actividad',
			title: 'Actividad',
			slides: [],
			error: { message: 'No se pudieron cargar los datos' }
		};
		return of(slot).pipe(delay(500));
	}

	/**
	 * Obtiene el slot de "Incidencias" con datos de ejemplo
	 * Solo 1 slide, sin autoRotate
	 */
	getIncidenciasSlot$(): Observable<KpiSlotVM> {
		const incidenciasAbiertas = 0; // Valor mock

		// Calcular severidad basada en el número de incidencias
		let severity: 'ok' | 'warn' | 'danger' = 'ok';
		if (incidenciasAbiertas > 3) {
			severity = 'danger';
		} else if (incidenciasAbiertas >= 1) {
			severity = 'warn';
		}

		const slot: KpiSlotVM = {
			id: 'incidencias',
			title: 'Incidencias',
			autoRotate: false, // Solo 1 slide, no necesita rotar
			slides: [
				{
					id: 'revision_facturas',
					label: 'Facturas por revisar',
					value: incidenciasAbiertas,
					valueFormatter: 'number',
					severity: severity,
					tooltip: 'Facturas que requieren revisión',
					ctaLabel: 'Ver facturas',
					ctaAction: { type: 'emit', key: 'open-incidencias' },
					visible: true
				}
			]
		};

		// Simula delay de red
		const randomDelay = Math.floor(Math.random() * 300) + 300;
		return of(slot).pipe(delay(randomDelay));
	}
}
