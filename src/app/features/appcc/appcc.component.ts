import { Component, inject, OnInit, OnDestroy, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SectionHeaderService } from '@app/layout/service/section-header.service';

// PrimeNG Imports
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';

interface AppccModule {
  id: string;
  title: string;
  icon: string;
  itemIcon: string;
  itemsCount: number;
  itemsLabel: string;
  lastUpdate: string;
  lastUpdateLabel: string;
}

// Interface for Equipment Form
interface EquipmentForm {
  name: string;
  type: string | null;
  temperatureRange: string | null;
  location: string | null;
  responsible: string | null;
  // Future fields
  equipmentId: string;
  hasIoTSensor: boolean;
  lastIncident: string;
  appccStatus: string | null;
}

@Component({
  selector: 'app-appcc',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    EmptyStateComponent,
    DropdownModule,
    InputTextModule,
    InputSwitchModule,
    ButtonModule
  ],
  templateUrl: './appcc.component.html'
})
export class AppccComponent implements OnInit, OnDestroy, AfterViewInit {
  private headerService = inject(SectionHeaderService);
  @ViewChild('headerTpl') headerTpl!: TemplateRef<any>;

  viewMode: 'cards' | 'list' = 'cards';

  modules: AppccModule[] = [
    {
      id: 'temperatures',
      title: 'Control de Temperaturas',
      icon: 'thermostat',
      itemIcon: 'kitchen',
      itemsCount: 4,
      itemsLabel: 'Equipos activos',
      lastUpdate: 'Hoy',
      lastUpdateLabel: 'Último registro'
    },
    {
      id: 'cleaning',
      title: 'Protocolos de Limpieza',
      icon: 'cleaning_services',
      itemIcon: 'cleaning_services',
      itemsCount: 8,
      itemsLabel: 'Zonas configuradas',
      lastUpdate: 'Ayer',
      lastUpdateLabel: 'Última revisión'
    }
  ];

  selectedModule: AppccModule | null = null;

  // Equipment Form State
  showEquipmentForm = false;
  equipmentForm: EquipmentForm = this.getEmptyEquipmentForm();
  savedEquipment: EquipmentForm[] = [];
  selectedEquipment: EquipmentForm | null = null;

  // Temperature Records
  temperatureRecords: { equipmentId: string; temperature: number; date: Date; registeredBy: string }[] = [];

  // Dropdown Options
  equipmentTypes = [
    { label: 'Timbre', value: 'timbre' },
    { label: 'Nevera', value: 'nevera' },
    { label: 'Botellero', value: 'botellero' },
    { label: 'Cámara panelada', value: 'camara_panelada' }
  ];

  temperatureRanges = [
    { label: 'Frío positivo (0ºC - 4ºC)', value: 'frio_positivo' },
    { label: 'Frío negativo (-18ºC)', value: 'frio_negativo' }
  ];

  locations = [
    { label: 'Cocina', value: 'cocina' },
    { label: 'Sala', value: 'sala' },
    { label: 'Almacén', value: 'almacen' }
  ];

  responsibles = [
    { label: 'Sin asignar (pendiente integración)', value: null }
  ];

  appccStatuses = [
    { label: 'OK', value: 'ok' },
    { label: 'Atención', value: 'atencion' },
    { label: 'Incidencia', value: 'incidencia' }
  ];

  ngOnInit() {
    // No special initialization needed
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy() {
    this.headerService.reset();
  }

  setViewMode(mode: string) {
    this.viewMode = mode as 'cards' | 'list';
  }

  openModule(module: AppccModule) {
    this.selectedModule = module;
    this.showEquipmentForm = false; // Reset form visibility when switching modules
  }

  closeModule() {
    this.selectedModule = null;
    this.showEquipmentForm = false;
  }

  toggleEquipmentForm() {
    this.showEquipmentForm = !this.showEquipmentForm;
    if (this.showEquipmentForm) {
      this.equipmentForm = this.getEmptyEquipmentForm();
    }
  }

  getEmptyEquipmentForm(): EquipmentForm {
    return {
      name: '',
      type: null,
      temperatureRange: null,
      location: null,
      responsible: null,
      equipmentId: this.generateTempId(),
      hasIoTSensor: false,
      lastIncident: '',
      appccStatus: null
    };
  }

  generateTempId(): string {
    return 'EQ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  saveEquipment() {
    // Add equipment to saved list
    this.savedEquipment.push({ ...this.equipmentForm });

    // Update the module's equipment count
    const tempModule = this.modules.find(m => m.id === 'temperatures');
    if (tempModule) {
      tempModule.itemsCount = this.savedEquipment.length;
      tempModule.lastUpdate = 'Ahora';
    }

    console.log('Equipment saved:', this.equipmentForm);
    this.showEquipmentForm = false;
    this.equipmentForm = this.getEmptyEquipmentForm();
  }

  cancelEquipmentForm() {
    this.showEquipmentForm = false;
    this.equipmentForm = this.getEmptyEquipmentForm();
  }

  selectEquipment(equipment: EquipmentForm) {
    this.selectedEquipment = equipment;
  }

  deselectEquipment() {
    this.selectedEquipment = null;
  }

  registerTemperature(temperature: number, equipment?: EquipmentForm) {
    const targetEquipment = equipment || this.selectedEquipment;
    if (!targetEquipment) return;

    this.temperatureRecords.push({
      equipmentId: targetEquipment.equipmentId,
      temperature,
      date: new Date(),
      registeredBy: 'Usuario actual' // TODO: Connect with user module
    });

    // Update module's last update
    const tempModule = this.modules.find(m => m.id === 'temperatures');
    if (tempModule) {
      tempModule.lastUpdate = 'Ahora';
    }

    console.log('Temperature registered:', temperature, 'for', targetEquipment.name);
  }

  getEquipmentRecords(equipmentId: string) {
    return this.temperatureRecords
      .filter(r => r.equipmentId === equipmentId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  getEquipmentTypeLabel(value: string | null): string {
    const found = this.equipmentTypes.find(t => t.value === value);
    return found ? found.label : 'No definido';
  }

  getLocationLabel(value: string | null): string {
    const found = this.locations.find(l => l.value === value);
    return found ? found.label : 'Sin ubicación';
  }

  getTemperatureRangeLabel(value: string | null): string {
    const found = this.temperatureRanges.find(t => t.value === value);
    return found ? found.label : 'No definido';
  }
}
