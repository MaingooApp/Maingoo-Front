import { Component, inject, OnInit, OnDestroy, AfterViewInit, ViewChild, TemplateRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { SectionNavigationService } from '@app/layout/service/section-navigation.service';
import { ButtonModule } from 'primeng/button';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AppccSectionHeaderDetailComponent } from './components/appcc-section-header-detail/appcc-section-header-detail.component';
import { IotAlert, IotDevice, IotDeviceStatus, IotDeviceType, IotReading, IotService } from './services/iot.service';

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

@Component({
  selector: 'app-appcc',
  standalone: true,
  imports: [CommonModule, IconComponent, EmptyStateComponent, ButtonModule, AppccSectionHeaderDetailComponent],
  templateUrl: './appcc.component.html'
})
export class AppccComponent implements OnInit, OnDestroy, AfterViewInit {
  private headerService = inject(SectionHeaderService);
  private sectionNavigationService = inject(SectionNavigationService);
  private iotService = inject(IotService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('headerTpl') headerTpl!: TemplateRef<unknown>;

  modules: AppccModule[] = [
    {
      id: 'temperatures',
      title: 'Control de Temperaturas',
      icon: 'thermostat',
      itemIcon: 'sensors',
      itemsCount: 0,
      itemsLabel: 'sensores',
      lastUpdate: 'Sin datos',
      lastUpdateLabel: 'Última lectura'
    }
    /*
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
    */
  ];

  selectedModule: AppccModule | null = null;
  selectedDevice: IotDevice | null = null;

  devices: IotDevice[] = [];
  activeAlerts: IotAlert[] = [];
  latestReadings: Record<string, IotReading | undefined> = {};
  selectedReadings: IotReading[] = [];

  isLoadingDevices = false;
  isLoadingReadings = false;

  ngOnInit() {
    this.sectionNavigationService.homeRequest$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((route) => {
      if (route === '/appcc') {
        this.resetToMainView();
      }
    });

    this.loadIotOverview();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy() {
    this.headerService.reset();
  }

  openModule(module: AppccModule) {
    this.selectedModule = module;
  }

  closeModule() {
    this.selectedModule = null;
    this.selectedDevice = null;
    this.selectedReadings = [];
  }

  private resetToMainView(): void {
    this.closeModule();
  }

  refreshIotData() {
    this.loadIotOverview();
    if (this.selectedDevice) {
      this.selectDevice(this.selectedDevice);
    }
  }

  selectDevice(device: IotDevice) {
    this.selectedDevice = device;
    this.isLoadingReadings = true;
    this.iotService
      .getDeviceReadings(device.id, { limit: 200 })
      .pipe(
        catchError(() => of([] as IotReading[])),
        finalize(() => {
          this.isLoadingReadings = false;
        })
      )
      .subscribe((readings) => {
        this.selectedReadings = readings;
        this.latestReadings[device.id] = readings[0] ?? this.latestReadings[device.id];
      });
  }

  deselectDevice() {
    this.selectedDevice = null;
    this.selectedReadings = [];
  }

  getDeviceAlerts(deviceId: string): IotAlert[] {
    return this.activeAlerts.filter((alert) => alert.deviceId === deviceId);
  }

  getLatestReading(deviceId: string): IotReading | undefined {
    return this.latestReadings[deviceId];
  }

  getTemperatureValue(reading?: IotReading): number | null {
    if (reading?.temperatureC === null || reading?.temperatureC === undefined) return null;
    const value = Number(reading.temperatureC);
    return Number.isFinite(value) ? value : null;
  }

  getBatteryValue(reading?: IotReading): number | null {
    if (reading?.batteryPct === null || reading?.batteryPct === undefined) return null;
    return Number.isFinite(reading.batteryPct) ? reading.batteryPct : null;
  }

  getDeviceTypeLabel(type: IotDeviceType): string {
    const labels: Record<IotDeviceType, string> = {
      TEMPERATURE: 'Temperatura',
      HUMIDITY: 'Humedad',
      DOOR: 'Apertura',
      WATER_LEAK: 'Fuga de agua',
      ELECTRICITY: 'Electricidad',
      PREDICTIVE_MAINTENANCE: 'Mantenimiento'
    };
    return labels[type] ?? type;
  }

  getDeviceTypeIcon(type: IotDeviceType): string {
    const icons: Record<IotDeviceType, string> = {
      TEMPERATURE: 'thermostat',
      HUMIDITY: 'humidity_percentage',
      DOOR: 'door_front',
      WATER_LEAK: 'water_drop',
      ELECTRICITY: 'bolt',
      PREDICTIVE_MAINTENANCE: 'precision_manufacturing'
    };
    return icons[type] ?? 'sensors';
  }

  getStatusLabel(status: IotDeviceStatus): string {
    const labels: Record<IotDeviceStatus, string> = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
      OFFLINE: 'Sin conexión'
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: IotDeviceStatus): string {
    if (status === 'ACTIVE') return 'bg-green-50 text-green-700 border-green-100';
    if (status === 'OFFLINE') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-surface-100 text-surface-600 border-surface';
  }

  getAlertLabel(type: IotAlert['type']): string {
    const labels: Record<IotAlert['type'], string> = {
      TEMPERATURE_HIGH: 'Temperatura alta',
      BATTERY_LOW: 'Batería baja',
      SENSOR_OFFLINE: 'Sensor sin conexión'
    };
    return labels[type] ?? type;
  }

  getSensorMetricLabel(device: IotDevice, reading?: IotReading): string {
    if (!reading) return 'Sin lecturas';
    const temperature = this.getTemperatureValue(reading);
    if (temperature !== null) return `${temperature.toFixed(1)} ºC`;
    const battery = this.getBatteryValue(reading);
    if (battery !== null) return `${battery}% batería`;
    return 'Lectura recibida';
  }

  getLastSeenLabel(device: IotDevice): string {
    return device.lastSeenAt ? this.formatDateTime(device.lastSeenAt) : 'Sin conexión reciente';
  }

  get offlineDevicesCount(): number {
    return this.devices.filter((device) => device.status === 'OFFLINE').length;
  }

  formatDateTime(value?: string | null): string {
    if (!value) return 'Sin datos';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  private loadIotOverview() {
    this.isLoadingDevices = true;
    forkJoin({
      devices: this.iotService.getDevices().pipe(catchError(() => of([] as IotDevice[]))),
      alerts: this.iotService.getAlerts({ status: 'ACTIVE' }).pipe(catchError(() => of([] as IotAlert[])))
    })
      .pipe(
        finalize(() => {
          this.isLoadingDevices = false;
        })
      )
      .subscribe(({ devices, alerts }) => {
        this.devices = devices;
        this.activeAlerts = alerts;
        this.updateTemperatureModule();
        this.loadLatestReadings(devices);
      });
  }

  private loadLatestReadings(devices: IotDevice[]) {
    if (devices.length === 0) {
      this.latestReadings = {};
      return;
    }

    const requests = devices.map((device) =>
      this.iotService.getDeviceReadings(device.id, { limit: 1 }).pipe(catchError(() => of([] as IotReading[])))
    );

    forkJoin(requests).subscribe((results) => {
      const latest: Record<string, IotReading | undefined> = {};
      results.forEach((readings, index) => {
        latest[devices[index].id] = readings[0];
      });
      this.latestReadings = latest;
      this.updateTemperatureModule();
    });
  }

  private updateTemperatureModule() {
    const module = this.modules.find((m) => m.id === 'temperatures');
    if (!module) return;

    const latestDates = Object.values(this.latestReadings)
      .map((reading) => reading?.receivedAt)
      .filter((date): date is string => !!date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    module.itemsCount = this.devices.length;
    module.itemsLabel = this.devices.length === 1 ? 'sensor' : 'sensores';
    module.lastUpdate = latestDates[0] ? this.formatDateTime(latestDates[0]) : 'Sin lecturas';
  }
}
