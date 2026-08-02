import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Observable, catchError, finalize, forkJoin, of } from 'rxjs';

import { FoodPreparation } from '@app/features/articles/interfaces/food-preparation.interfaces';
import { FoodPreparationService } from '@app/features/articles/services/food-preparation.service';
import { ConfirmDialogService } from '@app/shared/services/confirm-dialog.service';
import { AppPermission } from '@core/constants/permissions.enum';
import { AuthService } from '@features/auth/services/auth-service.service';
import { DevicePairingLookup } from '../../../device/models/device-session.models';
import { DevicePairingService } from '../../../device/services/device-pairing.service';
import {
  CreateKitchenStationDto,
  CreateCashRegisterDto,
  CreateModifierGroupDto,
  CreatePosAreaDto,
  CreatePosDeviceDto,
  CreatePosMenuItemDto,
  CreatePosMenuCategoryDto,
  CreatePosTableDto,
  UpdateKitchenStationDto,
  UpdateCashRegisterDto,
  UpdateModifierGroupDto,
  UpdatePosAreaDto,
  UpdatePosDeviceDto,
  UpdatePosMenuItemDto,
  UpdatePosMenuCategoryDto,
  UpdatePosSettingsDto,
  UpdatePosTableDto
} from '../../models/pos-configuration.models';
import {
  CashRegister,
  DiningArea,
  DiningTable,
  FiscalMode,
  KitchenStation,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  PosDevice,
  PosDeviceType,
  PosSettings
} from '../../models/pos.models';
import { PosService } from '../../services/pos.service';

type SettingsSection =
  | 'general'
  | 'devices'
  | 'registers'
  | 'areas'
  | 'tables'
  | 'categories'
  | 'items'
  | 'modifiers'
  | 'stations';
type ConfigEntity =
  | PosDevice
  | CashRegister
  | DiningArea
  | DiningTable
  | MenuCategory
  | MenuItem
  | ModifierGroup
  | KitchenStation;

interface SettingsForm {
  enabled: boolean;
  currency: string;
  timezone: string;
  pricesIncludeTax: boolean;
  allowNegativeStock: boolean;
  receiptFooter: string;
  fiscalMode: FiscalMode;
  issuerLegalName: string;
  issuerTaxId: string;
  issuerAddress: string;
  fiscalSeriesPrefix: string;
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
  modifierGroupIds: string[];
  minSelections: number;
  maxSelections: number;
  required: boolean;
  modifierOptions: ModifierOptionForm[];
}

interface ModifierOptionForm {
  id?: string;
  name: string;
  priceDeltaGross: string;
  active: boolean;
  sortOrder: number;
}

@Component({
  selector: 'app-pos-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule
  ],
  templateUrl: './pos-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosSettingsComponent {
  private readonly posService = inject(PosService);
  private readonly foodPreparationService = inject(FoodPreparationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pairingService = inject(DevicePairingService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly authService = inject(AuthService);

  readonly sections: SettingsSection[] = [
    'general',
    'devices',
    'registers',
    'areas',
    'tables',
    'categories',
    'items',
    'modifiers',
    'stations'
  ];
  readonly deviceTypes: PosDeviceType[] = ['REGISTER', 'KDS', 'BACKOFFICE'];
  readonly fiscalModes: FiscalMode[] = ['DISABLED', 'SANDBOX', 'VERIFACTU_TEST', 'VERIFACTU'];
  readonly canConfigureFiscal =
    (this.authService.hasPermission(AppPermission.PosManage) &&
      this.authService.hasPermission(AppPermission.FiscalWrite)) ||
    this.authService.hasPermission(AppPermission.AdminSuper);
  readonly activeSection = signal<SettingsSection>('general');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly foodPreparationsLoadError = signal(false);
  readonly dialogVisible = signal(false);
  readonly pairingDialogVisible = signal(false);
  readonly pairingLoading = signal(false);
  readonly pairingSubmitting = signal(false);
  readonly pairingLookup = signal<DevicePairingLookup | null>(null);
  readonly pairingErrorCode = signal<string | null>(null);
  readonly pairingSuccessKey = signal<string | null>(null);
  readonly revokeDialogVisible = signal(false);
  readonly revoking = signal(false);
  readonly revokeDeviceTarget = signal<PosDevice | null>(null);
  readonly revokeErrorCode = signal<string | null>(null);
  readonly devices = signal<PosDevice[]>([]);
  readonly cashRegisters = signal<CashRegister[]>([]);
  readonly areas = signal<DiningArea[]>([]);
  readonly tables = signal<DiningTable[]>([]);
  readonly categories = signal<MenuCategory[]>([]);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly modifierGroups = signal<ModifierGroup[]>([]);
  readonly foodPreparations = signal<FoodPreparation[]>([]);
  readonly stations = signal<KitchenStation[]>([]);
  readonly items = computed<ConfigEntity[]>(() => {
    switch (this.activeSection()) {
      case 'devices':
        return this.devices();
      case 'registers':
        return this.cashRegisters();
      case 'areas':
        return this.areas();
      case 'tables':
        return this.tables();
      case 'categories':
        return this.categories();
      case 'items':
        return this.menuItems();
      case 'modifiers':
        return this.modifierGroups();
      case 'stations':
        return this.stations();
      default:
        return [];
    }
  });

  settingsForm: SettingsForm = this.emptySettingsForm();
  entityForm: EntityForm = this.emptyEntityForm();
  editingEntityId: string | null = null;
  pairingCode = '';
  pairingName = '';
  pairingKitchenStationId = '';
  revokeReason = '';

  constructor() {
    this.loadAll();
    const code = this.route.snapshot.queryParamMap.get('userCode') ?? this.route.snapshot.queryParamMap.get('code');
    if (this.route.snapshot.routeConfig?.path === 'configuracion/dispositivos/emparejar' || code) {
      this.activeSection.set('devices');
      this.openPairing(code ?? '');
    }
  }

  selectSection(section: SettingsSection): void {
    this.activeSection.set(section);
  }

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.foodPreparationsLoadError.set(false);

    forkJoin({
      settings: this.posService.getSettings(),
      devices: this.posService.listDevices({}),
      cashRegisters: this.posService.listCashRegisters({}),
      areas: this.posService.listAreas({}),
      tables: this.posService.listTables({}),
      categories: this.posService.listMenuCategories({}),
      menuItems: this.posService.listMenuItems({}),
      modifierGroups: this.posService.listModifierGroups(),
      foodPreparations: this.foodPreparationService.getAll().pipe(
        catchError(() => {
          this.foodPreparationsLoadError.set(true);
          return of([]);
        })
      ),
      stations: this.posService.listKitchenStations({})
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({
          settings,
          devices,
          cashRegisters,
          areas,
          tables,
          categories,
          menuItems,
          modifierGroups,
          foodPreparations,
          stations
        }) => {
          this.settingsForm = this.settingsToForm(settings);
          this.devices.set(devices);
          this.cashRegisters.set(cashRegisters);
          this.areas.set(areas);
          this.tables.set(tables);
          this.categories.set(categories);
          this.menuItems.set(menuItems);
          this.modifierGroups.set(modifierGroups);
          this.foodPreparations.set(foodPreparations.filter((preparation) => preparation.type?.type === 'article'));
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

    if (this.canConfigureFiscal) {
      dto.fiscalMode = this.settingsForm.fiscalMode;
      const issuerLegalName = this.settingsForm.issuerLegalName.trim();
      const issuerTaxId = this.settingsForm.issuerTaxId.trim().toUpperCase();
      const issuerAddress = this.settingsForm.issuerAddress.trim();
      const fiscalSeriesPrefix = this.settingsForm.fiscalSeriesPrefix.trim().toUpperCase();
      if (issuerLegalName) dto.issuerLegalName = issuerLegalName;
      if (issuerTaxId) dto.issuerTaxId = issuerTaxId;
      if (issuerAddress) dto.issuerAddress = issuerAddress;
      if (fiscalSeriesPrefix) dto.fiscalSeriesPrefix = fiscalSeriesPrefix;
    }

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
      case 'registers': {
        const cashRegister = entity as CashRegister;
        this.entityForm = {
          ...this.entityForm,
          name: cashRegister.name,
          code: cashRegister.code,
          active: cashRegister.active
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
          modifierGroupIds: item.modifierGroups.map(({ id }) => id),
          sortOrder: item.sortOrder,
          active: item.active
        };
        break;
      }
      case 'modifiers': {
        const group = entity as ModifierGroup;
        this.entityForm = {
          ...this.entityForm,
          name: group.name,
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
          required: group.required,
          modifierOptions: group.options.map((option) => ({
            id: option.id,
            name: option.name,
            priceDeltaGross: option.priceDeltaGross,
            active: option.active,
            sortOrder: option.sortOrder
          }))
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

  selectFoodPreparation(foodPreparationId: string): void {
    this.entityForm.foodPreparationId = foodPreparationId;
    if (this.editingEntityId || !foodPreparationId) return;
    const article = this.foodPreparations().find(({ id }) => id === foodPreparationId);
    if (article) this.entityForm.name = article.name;
  }

  isActiveDevice(entity: ConfigEntity): entity is PosDevice {
    return 'status' in entity && entity.status === 'ACTIVE';
  }

  openRevoke(device: PosDevice): void {
    this.revokeDeviceTarget.set(device);
    this.revokeReason = '';
    this.revokeErrorCode.set(null);
    this.revokeDialogVisible.set(true);
  }

  closeRevoke(): void {
    this.revokeDialogVisible.set(false);
    this.revokeDeviceTarget.set(null);
  }

  revokeDevice(form: NgForm): void {
    const device = this.revokeDeviceTarget();
    const reason = this.revokeReason.trim();
    if (!device || form.invalid || reason.length < 10 || this.revoking()) {
      form.control.markAllAsTouched();
      return;
    }

    this.revoking.set(true);
    this.posService
      .revokeDevice(device.id, { reason, confirm: 'REVOKE', expectedStatus: 'ACTIVE' })
      .pipe(
        finalize(() => this.revoking.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.revokeErrorCode.set(null);
          this.closeRevoke();
          this.loadAll();
        },
        error: (error: HttpErrorResponse) => this.revokeErrorCode.set(error.error?.code ?? 'UNKNOWN')
      });
  }

  openPairing(code = ''): void {
    this.pairingCode = normalizePairingCode(code);
    this.pairingName = '';
    this.pairingKitchenStationId = '';
    this.pairingLookup.set(null);
    this.pairingErrorCode.set(null);
    this.pairingDialogVisible.set(true);
    if (isPairingCode(this.pairingCode)) this.lookupPairing();
  }

  closePairing(): void {
    if (this.pairingSubmitting()) return;
    this.pairingDialogVisible.set(false);
    void this.router.navigate(['/ventas/configuracion']);
  }

  pairingCodeValid(): boolean {
    return isPairingCode(normalizePairingCode(this.pairingCode));
  }

  lookupPairing(): void {
    const userCode = normalizePairingCode(this.pairingCode);
    this.pairingCode = userCode;
    this.pairingLookup.set(null);
    this.pairingErrorCode.set(null);
    if (!isPairingCode(userCode)) {
      this.pairingErrorCode.set('PAIRING_CODE_INVALID');
      return;
    }

    this.pairingLoading.set(true);
    this.pairingService
      .lookup(userCode)
      .pipe(
        finalize(() => this.pairingLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (pairing) => {
          this.pairingLookup.set(pairing);
          this.pairingName = pairing.requestedLabel?.trim() ?? '';
        },
        error: (error: unknown) => this.pairingErrorCode.set(pairingErrorCode(error))
      });
  }

  async approvePairing(): Promise<void> {
    const pairing = this.pairingLookup();
    const name = this.pairingName.trim();
    if (!pairing || pairing.status !== 'PENDING' || !name || this.pairingSubmitting()) return;
    if (
      !(await this.confirmDialog.confirm({
        header: this.translate.instant('pos.settings.devicePairing.approveConfirmTitle'),
        message: this.translate.instant('pos.settings.devicePairing.approveConfirmMessage', {
          code: this.pairingCode,
          name
        }),
        acceptLabel: this.translate.instant('pos.settings.devicePairing.approve'),
        rejectLabel: this.translate.instant('pos.settings.cancel'),
        icon: 'help'
      }))
    )
      return;

    this.submitPairing(
      this.pairingService.approve(pairing.id, {
        userCode: this.pairingCode,
        name,
        ...(pairing.requestedType === 'KDS' ? { kitchenStationId: this.pairingKitchenStationId || null } : {})
      }),
      'pos.settings.devicePairing.approved',
      pairing.requestedType === 'REGISTER'
    );
  }

  async denyPairing(): Promise<void> {
    const pairing = this.pairingLookup();
    if (!pairing || pairing.status !== 'PENDING' || this.pairingSubmitting()) return;
    if (
      !(await this.confirmDialog.confirm({
        header: this.translate.instant('pos.settings.devicePairing.denyConfirmTitle'),
        message: this.translate.instant('pos.settings.devicePairing.denyConfirmMessage', { code: this.pairingCode }),
        acceptLabel: this.translate.instant('pos.settings.devicePairing.deny'),
        rejectLabel: this.translate.instant('pos.settings.cancel'),
        acceptButtonStyleClass: 'p-button-danger',
        icon: 'warning'
      }))
    )
      return;

    this.submitPairing(
      this.pairingService.deny(pairing.id, { userCode: this.pairingCode }),
      'pos.settings.devicePairing.denied'
    );
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
      case 'registers': {
        const dto: CreateCashRegisterDto | UpdateCashRegisterDto = {
          name,
          code: this.entityForm.code.trim(),
          active: this.entityForm.active
        };
        this.runSave(
          id
            ? this.posService.updateCashRegister(id, dto)
            : this.posService.createCashRegister(dto as CreateCashRegisterDto),
          true
        );
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
          modifierGroupIds: this.entityForm.modifierGroupIds,
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
      case 'modifiers': {
        const options = this.entityForm.modifierOptions.map((option) => ({
          id: option.id,
          name: option.name.trim(),
          priceDeltaGross: option.priceDeltaGross.trim(),
          active: option.active,
          sortOrder: option.sortOrder
        }));
        const dto = {
          name,
          minSelections: this.entityForm.minSelections,
          maxSelections: this.entityForm.maxSelections,
          required: this.entityForm.required
        };
        this.runSave(
          id
            ? this.posService.updateModifierGroup(id, {
                ...dto,
                options
              } satisfies UpdateModifierGroupDto)
            : this.posService.createModifierGroup({
                ...dto,
                options
              } satisfies CreateModifierGroupDto),
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
      case 'registers': {
        const cashRegister = entity as CashRegister;
        return [
          cashRegister.code,
          this.translate.instant(`pos.settings.activeStates.${cashRegister.active ? 'active' : 'inactive'}`)
        ].join(separator);
      }
      case 'modifiers': {
        const group = entity as ModifierGroup;
        return [
          `${this.translate.instant('pos.settings.fields.options')}: ${group.options.length}`,
          `${group.minSelections}–${group.maxSelections}`
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

  addModifierOption(): void {
    this.entityForm.modifierOptions.push({
      name: '',
      priceDeltaGross: '0.00',
      active: true,
      sortOrder: this.entityForm.modifierOptions.length
    });
  }

  removeModifierOption(index: number): void {
    if (this.entityForm.modifierOptions.length > 1) {
      this.entityForm.modifierOptions.splice(index, 1);
    }
  }

  modifierSelectionRangeInvalid(): boolean {
    const activeOptionCount = this.entityForm.modifierOptions.filter((option) => option.active).length;
    return (
      this.activeSection() === 'modifiers' &&
      (this.entityForm.maxSelections < 1 ||
        this.entityForm.minSelections < 0 ||
        this.entityForm.minSelections > this.entityForm.maxSelections ||
        this.entityForm.maxSelections > activeOptionCount ||
        (this.entityForm.required && this.entityForm.minSelections < 1))
    );
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

  private submitPairing(request: Observable<unknown>, successKey: string, configureOperatorPins = false): void {
    this.pairingSubmitting.set(true);
    this.pairingErrorCode.set(null);
    request
      .pipe(
        finalize(() => this.pairingSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.pairingDialogVisible.set(false);
          this.pairingSuccessKey.set(successKey);
          this.loadAll();
          void this.router.navigate(configureOperatorPins ? ['/usuarios'] : ['/ventas/configuracion'], {
            queryParams: configureOperatorPins ? { setupPosPin: '1' } : undefined
          });
        },
        error: (error: unknown) => this.pairingErrorCode.set(pairingErrorCode(error))
      });
  }

  private settingsToForm(settings: PosSettings): SettingsForm {
    return {
      enabled: settings.enabled,
      currency: settings.currency,
      timezone: settings.timezone,
      pricesIncludeTax: settings.pricesIncludeTax,
      allowNegativeStock: settings.allowNegativeStock,
      receiptFooter: settings.receiptFooter ?? '',
      fiscalMode: settings.fiscalMode,
      issuerLegalName: settings.issuerLegalName ?? '',
      issuerTaxId: settings.issuerTaxId ?? '',
      issuerAddress: settings.issuerAddress ?? '',
      fiscalSeriesPrefix: settings.fiscalSeriesPrefix ?? ''
    };
  }

  private emptySettingsForm(): SettingsForm {
    return {
      enabled: false,
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      pricesIncludeTax: true,
      allowNegativeStock: false,
      receiptFooter: '',
      fiscalMode: 'DISABLED',
      issuerLegalName: '',
      issuerTaxId: '',
      issuerAddress: '',
      fiscalSeriesPrefix: ''
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
      kitchenStationId: '',
      modifierGroupIds: [],
      minSelections: 0,
      maxSelections: 1,
      required: false,
      modifierOptions: [{ name: '', priceDeltaGross: '0.00', active: true, sortOrder: 0 }]
    };
  }
}

function normalizePairingCode(value: string): string {
  const compact = value.trim().toUpperCase().replace(/[\s-]/g, '');
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : value.trim().toUpperCase();
}

function isPairingCode(value: string): boolean {
  return /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(value);
}

function pairingErrorCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
    return 'PAIRING_REQUEST_FAILED';
  }
  const code = (error.error as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : 'PAIRING_REQUEST_FAILED';
}
