import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiSlotComponent } from './components/kpi-slot/kpi-slot.component';
import { DashboardKpiSlotMockService } from './services/dashboard-kpi-slot.mock.service';
import { KpiSlotVM, KpiSlotClickEvent, KpiSlideChangeEvent } from './interfaces/kpi-slot.interfaces';
import { Observable, startWith } from 'rxjs';

/**
 * Componente principal del Dashboard
 * Muestra KPI slots y cards de métricas del restaurante
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, KpiSlotComponent],
  templateUrl: './dashboard.component.html'
})
export class Dashboard implements OnInit {
  private kpiSlotService = inject(DashboardKpiSlotMockService);

  /** Observable del slot de Actividad con estado loading inicial */
  actividadSlot$!: Observable<KpiSlotVM>;

  /** Observable del slot de Incidencias con estado loading inicial */
  incidenciasSlot$!: Observable<KpiSlotVM>;

  /** Slot inicial en estado loading para Actividad */
  private readonly loadingSlotActividad: KpiSlotVM = {
    id: 'actividad',
    title: 'Actividad',
    slides: [],
    loading: true
  };

  /** Slot inicial en estado loading para Incidencias */
  private readonly loadingSlotIncidencias: KpiSlotVM = {
    id: 'incidencias',
    title: 'Incidencias',
    slides: [],
    loading: true
  };

  ngOnInit(): void {
    this.loadActividadSlot();
    this.loadIncidenciasSlot();
  }

  /**
   * Carga el slot de Actividad con estado loading inicial
   */
  loadActividadSlot(): void {
    this.actividadSlot$ = this.kpiSlotService.getActividadSlot$().pipe(
      startWith(this.loadingSlotActividad)
    );
  }

  /**
   * Carga el slot de Incidencias con estado loading inicial
   */
  loadIncidenciasSlot(): void {
    this.incidenciasSlot$ = this.kpiSlotService.getIncidenciasSlot$().pipe(
      startWith(this.loadingSlotIncidencias)
    );
  }

  /**
   * Handler para click en un slot/slide
   */
  onSlotClick(event: KpiSlotClickEvent): void {
    console.log('🔵 Slot Click:', event);
  }

  /**
   * Handler para cambio de slide
   */
  onSlideChange(event: KpiSlideChangeEvent): void {
    console.log('🔄 Slide Change:', event);
  }

  /**
   * Handler para retry tras error en slot Actividad
   */
  onRetryActividad(): void {
    console.log('🔄 Retry Actividad requested');
    this.loadActividadSlot();
  }

  /**
   * Handler para retry tras error en slot Incidencias
   */
  onRetryIncidencias(): void {
    console.log('🔄 Retry Incidencias requested');
    this.loadIncidenciasSlot();
  }
}

