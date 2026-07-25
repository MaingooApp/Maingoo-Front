import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Observable, catchError, finalize, forkJoin, of } from 'rxjs';

import { FoodPreparation } from '@app/features/articles/interfaces/food-preparation.interfaces';
import { FoodPreparationService } from '@app/features/articles/services/food-preparation.service';
import {
  CreateKitchenStationDto,
  CreatePosAreaDto,
  CreatePosDeviceDto,
  CreatePosMenuItemDto,
  CreatePosMenuCategoryDto,
  CreatePosTableDto,
  UpdateKitchenStationDto,
  UpdatePosAreaDto,
  UpdatePosDeviceDto,
  UpdatePosMenuItemDto,
  UpdatePosMenuCategoryDto,
  UpdatePosSettingsDto,
  UpdatePosTableDto
} from '../../models/pos-configuration.models';
import {
  DiningArea,
  DiningTable,
  KitchenStation,
  MenuCategory,
  MenuItem,
  PosDevice,
  PosDeviceType,
  PosSettings
} from '../../models/pos.models';
import { PosService } from '../../services/pos.service';

type SettingsSection = 'general' | 'devices' | 'areas' | 'tables' | 'categories' | 'items' | 'stations';
type ConfigEntity = PosDevice | DiningArea | DiningTable | MenuCategory | MenuItem | KitchenStation;

interface SettingsForm {
  enabled: boolean;
  currency: string;
  timezone: string;
  pricesIncludeTax: boolean;
  allowNegativeStock: boolean;
  receiptFooter: string;
}

interface EntityForm {
  name: string;
  code: string;
  type: PosDeviceType;
  appVersion: string;
  areaId: string;
  capacity: number;
  sortOrder: number;
  active: boolean;
  color: string;
  categoryId: string;
  priceGross: string;
  taxRate: string;
  trackStock: boolean;
  foodPreparationId: string;
  kitchenStationId: string;
}

@Component({
  selector: 'app-pos-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ButtonModule, DialogModule, InputNumberModule, InputTextModule],
  templateUrl: './pos-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosSettingsComponent {
  private readonly posService = inject(PosService);
  private readonly foodPreparationService = inject(FoodPreparationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sections: SettingsSection[] = ['general', 'devices', 'areas', 'tables', 'categories', 'items', 'stations'];
  readonly deviceTypes: PosDeviceType[] = ['REGISTER', 'KDS', 'BACKOFFICE'];
  readonly activeSection = signal<SettingsSection>('general');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly dialogVisible = signal(false);
  readonly devices = signal<PosDevice[]>([]);
  readonly areas = signal<DiningArea[]>([]);
  readonly tables = signal<DiningTable[]>([]);
  readonly categories = signal<MenuCategory[]>([]);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly foodPreparations = signal<FoodPreparation[]>([]);
  readonly stations = signal<KitchenStation[]>([]);
  readonly items = computed<ConfigEntity[]>(() => {
    switch (this.activeSection()) {
      case 'devices':
        return this.devices();
      case 'areas':
        return this.areas();
      case 'tables':
        return this.tables();
      case 'categories':
        return this.categories();
      case 'items':
        return this.menuItems();
      case 'stations':
        return this.stations();
      default:
        return [];
    }
  });

  settingsForm: SettingsForm = this.emptySettingsForm();
  entityForm: EntityForm = this.emptyEntityForm();
  editingEntityId: string | null = null;

  constructor() {
    this.loadAll();
  }

  selectSection(section: SettingsSection): void {
    this.activeSection.set(section);
  }

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      settings: this.posService.getSettings(),
      devices: this.posService.listDevices({}),
      areas: this.posService.listAreas({}),
      tables: this.posService.listTables({}),
      categories: this.posService.listMenuCategories({}),
      menuItems: this.posService.listMenuItems({}),
      foodPreparations: this.foodPreparationService.getAll().pipe(catchError(() => of([]))),
      stations: this.posService.listKitchenStations({})
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ settings, devices, areas, tables, categories, menuItems, foodPreparations, stations }) => {
          this.settingsForm = this.settingsToForm(settings);
          this.devices.set(devices);
          this.areas.set(areas);
          this.tables.set(tables);
          this.categories.set(categories);
          this.menuItems.set(menuItems);
          this.foodPreparations.set(foodPreparations);
          this.stations.set(stations);
        },
        error: () => this.loadError.set(true)
      });
  }

  saveSettings(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const dto: UpdatePosSettingsDto = {
      enabled: this.settingsForm.enabled,
      currency: this.settingsForm.currency.trim().toUpperCase(),
      timezone: this.settingsForm.timezone.trim(),
      pricesIncludeTax: this.settingsForm.pricesIncludeTax,
      allowNegativeStock: this.settingsForm.allowNegativeStock,
      receiptFooter: this.settingsForm.receiptFooter.trim()
    };

    this.runSave(this.posService.updateSettings(dto));
  }

  openCreate(): void {
    this.editingEntityId = null;
    this.entityForm = this.emptyEntityForm();
    if (this.activeSection() === 'tables' && this.areas().length) {
      this.entityForm.areaId = this.areas()[0].id;
    }
    if (this.activeSection() === 'items' && this.categories().length) {
      this.entityForm.categoryId = this.categories()[0].id;
    }
    this.dialogVisible.set(true);
  }

  openEdit(entity: ConfigEntity): void {
    this.editingEntityId = entity.id;
    this.entityForm = this.emptyEntityForm();

    switch (this.activeSection()) {
      case 'devices': {
        const device = entity as PosDevice;
        this.entityForm = {
          ...this.entityForm,
          name: device.name,
          code: device.code,
          type: device.type,
          appVersion: device.appVersion ?? ''
        };
        break;
      }
      case 'areas': {
        const area = entity as DiningArea;
        this.entityForm = { ...this.entityForm, name: area.name, sortOrder: area.sortOrder, active: area.active };
        break;
      }
      case 'tables': {
        const table = entity as DiningTable;
        this.entityForm = {
          ...this.entityForm,
          name: table.name,
          areaId: table.areaId,
          capacity: table.capacity,
          sortOrder: table.sortOrder,
          active: table.active
        };
        break;
      }
      case 'categories': {
        const category = entity as MenuCategory;
        this.entityForm = {
          ...this.entityForm,
          name: category.name,
          color: category.color ?? '#3B82F6',
          sortOrder: category.sortOrder,
          active: category.active
        };
        break;
      }
      case 'items': {
        const item = entity as MenuItem;
        this.entityForm = {
          ...this.entityForm,
          name: item.name,
          categoryId: item.categoryId,
          priceGross: item.priceGross,
          taxRate: item.taxRate,
          trackStock: item.trackStock,
          foodPreparationId: item.foodPreparationId ?? '',
          kitchenStationId: item.kitchenStationId ?? '',
          sortOrder: item.sortOrder,
          active: item.active
        };
        break;
      }
      case 'stations': {
        const station = entity as KitchenStation;
        this.entityForm = {
          ...this.entityForm,
          name: station.name,
          sortOrder: station.sortOrder,
          active: station.active
        };
        break;
      }
    }

    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  saveEntity(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const id = this.editingEntityId;
    const name = this.entityForm.name.trim();

    switch (this.activeSection()) {
      case 'devices': {
        const update: UpdatePosDeviceDto = {
          name,
          type: this.entityForm.type,
          appVersion: this.entityForm.appVersion.trim() || undefined
        };
        const create: CreatePosDeviceDto = {
          ...update,
          name,
          code: this.entityForm.code.trim(),
          type: this.entityForm.type
        };
        this.runSave(id ? this.posService.updateDevice(id, update) : this.posService.createDevice(create), true);
        break;
      }
      case 'areas': {
        const dto: CreatePosAreaDto | UpdatePosAreaDto = {
          name,
          sortOrder: this.entityForm.sortOrder,
          active: this.entityForm.active
        };
        this.runSave(
          id ? this.posService.updateArea(id, dto) : this.posService.createArea(dto as CreatePosAreaDto),
          true
        );
        break;
      }
      case 'tables': {
        const dto: CreatePosTableDto | UpdatePosTableDto = {
          name,
          areaId: this.entityForm.areaId,
          capacity: this.entityForm.capacity,
          sortOrder: this.entityForm.sortOrder,
          active: this.entityForm.active
        };
        this.runSave(
          id ? this.posService.updateTable(id, dto) : this.posService.createTable(dto as CreatePosTableDto),
          true
        );
        break;
      }
      case 'categories': {
        const dto: CreatePosMenuCategoryDto | UpdatePosMenuCategoryDto = {
          name,
          color: this.entityForm.color,
          sortOrder: this.entityForm.sortOrder,
          active: this.entityForm.active
        };
        this.runSave(
          id
            ? this.posService.updateMenuCategory(id, dto)
            : this.posService.createMenuCategory(dto as CreatePosMenuCategoryDto),
          true
        );
        break;
      }
      case 'items': {
        const dto = {
          name,
          categoryId: this.entityForm.categoryId,
          priceGross: this.entityForm.priceGross.trim(),
          taxRate: this.entityForm.taxRate.trim(),
          trackStock: this.entityForm.trackStock,
          kitchenStationId: this.entityForm.kitchenStationId || null,
          sortOrder: this.entityForm.sortOrder,
          active: this.entityForm.active
        };
        this.runSave(
          id
            ? this.posService.updateMenuItem(id, {
                ...dto,
                foodPreparationId: this.entityForm.foodPreparationId.trim() || null
              } satisfies UpdatePosMenuItemDto)
            : this.posService.createMenuItem({
                ...dto,
                foodPreparationId: this.entityForm.foodPreparationId.trim() || undefined
              } satisfies CreatePosMenuItemDto),
          true
        );
        break;
      }
      case 'stations': {
        const dto: CreateKitchenStationDto | UpdateKitchenStationDto = {
          name,
          sortOrder: this.entityForm.sortOrder,
          active: this.entityForm.active
        };
        this.runSave(
          id
            ? this.posService.updateKitchenStation(id, dto)
            : this.posService.createKitchenStation(dto as CreateKitchenStationDto),
          true
        );
        break;
      }
    }
  }

  entityMeta(entity: ConfigEntity): string {
    const separator = ' · ';
    switch (this.activeSection()) {
      case 'devices': {
        const device = entity as PosDevice;
        return [
          device.code,
          this.translate.instant(`pos.settings.deviceTypes.${device.type}`),
          this.translate.instant(`pos.settings.deviceStatuses.${device.status}`)
        ].join(separator);
      }
      case 'areas':
      case 'categories':
      case 'stations': {
        const item = entity as DiningArea | MenuCategory | KitchenStation;
        return [
          `${this.translate.instant('pos.settings.fields.sortOrder')}: ${item.sortOrder}`,
          this.translate.instant(`pos.settings.activeStates.${item.active ? 'active' : 'inactive'}`)
        ].join(separator);
      }
      case 'items': {
        const item = entity as MenuItem;
        const category = this.categories().find((candidate) => candidate.id === item.categoryId);
        return [
          category?.name ?? this.translate.instant('pos.settings.unknownCategory'),
          `${item.priceGross} ${this.settingsForm.currency}`,
          `${this.translate.instant('pos.settings.fields.taxRate')}: ${item.taxRate}%`
        ].join(separator);
      }
      case 'tables': {
        const table = entity as DiningTable;
        const area = this.areas().find((candidate) => candidate.id === table.areaId);
        return [
          area?.name ?? this.translate.instant('pos.settings.unknownArea'),
          `${this.translate.instant('pos.settings.fields.capacity')}: ${table.capacity}`,
          this.translate.instant(`pos.settings.activeStates.${table.active ? 'active' : 'inactive'}`)
        ].join(separator);
      }
      default:
        return '';
    }
  }

  private runSave(request: Observable<unknown>, closeDialog = false): void {
    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          if (closeDialog) this.dialogVisible.set(false);
          this.loadAll();
        },
        error: () => this.loadError.set(true)
      });
  }

  private settingsToForm(settings: PosSettings): SettingsForm {
    return {
      enabled: settings.enabled,
      currency: settings.currency,
      timezone: settings.timezone,
      pricesIncludeTax: settings.pricesIncludeTax,
      allowNegativeStock: settings.allowNegativeStock,
      receiptFooter: settings.receiptFooter ?? ''
    };
  }

  private emptySettingsForm(): SettingsForm {
    return {
      enabled: false,
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      pricesIncludeTax: true,
      allowNegativeStock: false,
      receiptFooter: ''
    };
  }

  private emptyEntityForm(): EntityForm {
    return {
      name: '',
      code: '',
      type: 'REGISTER',
      appVersion: '',
      areaId: '',
      capacity: 1,
      sortOrder: 0,
      active: true,
      color: '#3B82F6',
      categoryId: '',
      priceGross: '0.00',
      taxRate: '10.00',
      trackStock: false,
      foodPreparationId: '',
      kitchenStationId: ''
    };
  }
}
