import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { AddPaymentRequest, PaymentDialogComponent } from '../../components/payment/payment-dialog.component';
import { ReceiptViewComponent } from '../../components/payment/receipt-view.component';
import {
  DiningTable,
  MenuItem,
  MenuItemModifierGroup,
  OperationalPosOrder,
  PosDevice,
  PosOrder
} from '../../models/pos.models';
import { PosOrderLineViewModel, PosOrderViewModel } from '../../models/pos-local.models';
import { PosSessionStore } from '../../services/pos-session.store';
import { PosService } from '../../services/pos.service';
import { PosTelemetryService } from '../../services/pos-telemetry.service';
import { AppPermission } from '@core/constants/permissions.enum';
import { AuthService } from '@features/auth/services/auth-service.service';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { DeviceSessionService } from '../../../device/services/device-session.service';

const DEVICE_STORAGE_KEY = 'maingoo-pos-device-id';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [
    ButtonModule,
    CommonModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    PaymentDialogComponent,
    ReceiptViewComponent,
    RouterLink,
    SkeletonComponent,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-terminal.component.html'
})
export class PosTerminalComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly posService = inject(PosService);
  private readonly permissions = inject(NgxPermissionsService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly deviceSession = inject(DeviceSessionService, { optional: true });
  private legacyMigrationAttempted = false;

  readonly pairedTerminal = this.route?.snapshot.data['deviceMode'] === 'REGISTER';
  readonly store = inject(PosSessionStore);
  readonly telemetry = inject(PosTelemetryService);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly devices = signal<PosDevice[]>([]);
  readonly loadingDevices = signal(false);
  readonly deviceListError = signal(false);
  readonly selectedDeviceId = signal('');
  readonly selectingDevice = signal(false);
  readonly canManageDevices = !!this.permissions.getPermission(AppPermission.PosManage);
  readonly selectedAreaId = signal<string | null>(null);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly mobileView = signal<'ROOM' | 'MENU' | 'ORDER'>('ROOM');
  readonly search = signal('');
  readonly modifierItem = signal<MenuItem | null>(null);
  readonly selectedModifierOptionIds = signal<string[]>([]);
  readonly modifierNote = signal('');
  readonly voidLineId = signal<string | null>(null);
  readonly voidLineName = signal('');
  readonly voidReason = signal('');
  readonly newOrderTable = signal<DiningTable | null>(null);
  readonly guestCount = signal<number | null>(null);
  readonly paymentVisible = signal(false);
  readonly receiptOrder = signal<OperationalPosOrder | PosOrder | null>(null);
  readonly canReadFiscal = !this.pairedTerminal && !!this.permissions.getPermission(AppPermission.FiscalRead);
  readonly canConfigureFiscal =
    !this.pairedTerminal &&
    ((!!this.permissions.getPermission(AppPermission.PosManage) &&
      !!this.permissions.getPermission(AppPermission.FiscalWrite)) ||
      !!this.permissions.getPermission(AppPermission.AdminSuper));
  readonly canVoidLines = this.pairedTerminal
    ? (this.deviceSession?.operatorSession()?.permissions.includes(AppPermission.PosVoid) ?? false)
    : !!this.permissions.getPermission(AppPermission.PosVoid);

  readonly activeAreas = computed(() =>
    this.store
      .areas()
      .filter(({ active }) => active)
      .sort((left, right) => left.sortOrder - right.sortOrder)
  );
  readonly visibleTables = computed(() =>
    this.store
      .tables()
      .filter(({ active, areaId }) => active && (!this.selectedAreaId() || areaId === this.selectedAreaId()))
      .sort((left, right) => left.sortOrder - right.sortOrder)
  );
  readonly activeOrderByTable = computed(
    () =>
      new Map(
        this.store
          .activeOrders()
          .filter((order) => order.tableId)
          .map((order) => [order.tableId as string, order])
      )
  );
  readonly takeawayOrders = computed(() =>
    this.store
      .activeOrders()
      .filter(({ channel, tableId }) => channel === 'TAKEAWAY' && tableId === null)
      .sort((left, right) => left.displayNumber.localeCompare(right.displayNumber))
  );
  readonly activeCategories = computed(() =>
    this.store
      .menuCategories()
      .filter(({ active }) => active)
      .sort((left, right) => left.sortOrder - right.sortOrder)
  );
  readonly visibleMenuItems = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();

    return this.store
      .menuItems()
      .filter(
        ({ active, categoryId, name, description, sku }) =>
          active &&
          (!this.selectedCategoryId() || categoryId === this.selectedCategoryId()) &&
          (!search || [name, description, sku].some((value) => value?.toLocaleLowerCase().includes(search)))
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
  });
  readonly modifierGroups = computed(() =>
    [...(this.modifierItem()?.modifierGroups ?? [])].sort((left, right) => left.sortOrder - right.sortOrder)
  );
  readonly modifierLimitExceeded = computed(() => this.selectedModifierOptionIds().length > 20);
  readonly modifiersValid = computed(
    () =>
      !this.modifierLimitExceeded() &&
      this.modifierGroups().every((group) => {
        const count = this.selectionCount(group);
        return count >= this.minimumSelections(group) && count <= group.maxSelections;
      })
  );
  readonly selectedOrderTable = computed(() => {
    const tableId = this.store.selectedOrder()?.tableId;
    return tableId ? (this.store.tables().find(({ id }) => id === tableId) ?? null) : null;
  });
  readonly selectedOrderItemCount = computed(() =>
    (this.store.selectedOrder()?.lines ?? [])
      .filter(({ serverStatus }) => serverStatus !== 'VOIDED')
      .reduce((total, { quantity }) => total + Number(quantity), 0)
  );
  readonly canSendOrder = computed(() => {
    const order = this.store.selectedOrder();
    return (
      !!order &&
      order.serverStatus !== 'PAID' &&
      order.serverStatus !== 'CANCELLED' &&
      order.localStatus !== 'PENDING_SEND' &&
      order.syncStatus !== 'FAILED' &&
      order.syncStatus !== 'CONFLICT' &&
      order.lines.some(({ serverStatus }) => serverStatus === null || serverStatus === 'OPEN')
    );
  });
  readonly canOpenPayment = computed(() => {
    const order = this.store.selectedOrder();
    const activeLines = order?.lines.filter(({ serverStatus }) => serverStatus !== 'VOIDED') ?? [];
    return (
      !!order &&
      !!this.store.selectedAuthoritativeOrder() &&
      order.serverStatus !== 'PAID' &&
      order.serverStatus !== 'CANCELLED' &&
      activeLines.length > 0 &&
      activeLines.every(({ serverStatus }) => serverStatus === 'SENT')
    );
  });
  readonly paymentBlockedReason = computed<'OFFLINE' | 'PENDING_SYNC' | null>(() => {
    if (!this.online()) return 'OFFLINE';
    return this.store.selectedOrder()?.pendingCommandCount ? 'PENDING_SYNC' : null;
  });
  readonly receiptFiscalDocument = computed(() => this.receiptOrder()?.fiscalDocuments.at(-1) ?? null);
  readonly receiptStockSyncStatus = computed(() => {
    const orderId = this.receiptOrder()?.id;
    if (!orderId) return null;

    const storedOrder = this.store.authoritativeOrder(orderId);
    if (storedOrder && 'stockSyncJob' in storedOrder) return storedOrder.stockSyncJob?.status ?? null;
    return this.store.stockSyncJobs().find((job) => job.orderId === orderId)?.status ?? null;
  });

  async ngOnInit(): Promise<void> {
    if (this.pairedTerminal) {
      await this.initializePairedTerminal();
      return;
    }

    const enterpriseId = this.authService.getEnterpriseId();
    if (!enterpriseId) {
      this.store.errorCode.set('POS_ENTERPRISE_REQUIRED');
      return;
    }

    this.bindConnectivity();
    await this.store.initialize(enterpriseId);
    const cachedDevice = this.store.device();
    if (cachedDevice) this.selectedDeviceId.set(cachedDevice.id);
    this.loadDevices();
  }

  ngOnDestroy(): void {
    if (this.pairedTerminal) this.store.reset();
  }

  loadDevices(): void {
    if (this.pairedTerminal) return;
    this.loadingDevices.set(true);
    this.deviceListError.set(false);
    this.posService
      .listDevices({ type: 'REGISTER', status: 'ACTIVE' })
      .pipe(
        finalize(() => this.loadingDevices.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (devices) => {
          const enterpriseId = this.authService.getEnterpriseId();
          const registers = devices.filter(
            (device) => device.enterpriseId === enterpriseId && device.type === 'REGISTER' && device.status === 'ACTIVE'
          );
          this.devices.set(registers);
          const cachedDevice = this.store.device();
          if (cachedDevice && registers.some(({ id }) => id === cachedDevice.id)) {
            this.selectedDeviceId.set(cachedDevice.id);
            void this.store.activateDevice(cachedDevice.id);
          } else if (cachedDevice) {
            this.selectedDeviceId.set('');
            this.selectingDevice.set(true);
            void this.store.invalidateCachedDevice();
          } else {
            void this.migrateLegacyDevice(registers);
          }
        },
        error: () => this.deviceListError.set(true)
      });
  }

  async activateDevice(): Promise<void> {
    const deviceId = this.pairedTerminal ? this.deviceSession?.device()?.id : this.selectedDeviceId();
    if (!deviceId) return;

    await this.store.activateDevice(deviceId);
    if (this.store.device()?.id === deviceId && !this.store.errorCode()) this.selectingDevice.set(false);
  }

  changeDevice(): void {
    if (this.pairedTerminal) return;
    if (this.store.pendingCommandCount() > 0) return;
    this.selectedDeviceId.set('');
    this.selectingDevice.set(true);
  }

  tableOrder(tableId: string): PosOrderViewModel | undefined {
    return this.activeOrderByTable().get(tableId);
  }

  openTable(table: DiningTable): void {
    const order = this.tableOrder(table.id);
    if (order) {
      this.openOrder(order.id);
      return;
    }

    this.newOrderTable.set(table);
    this.guestCount.set(null);
  }

  closeNewTableOrder(): void {
    this.newOrderTable.set(null);
    this.guestCount.set(null);
  }

  guestCountValid(): boolean {
    const count = this.guestCount();
    return count === null || (Number.isInteger(count) && count >= 1 && count <= 999);
  }

  async confirmNewTableOrder(): Promise<void> {
    const table = this.newOrderTable();
    if (!table || !this.guestCountValid()) return;

    await this.store.createOrder('DINE_IN', table.id, this.guestCount() ?? undefined);
    if (!this.store.operationErrorCode()) {
      this.closeNewTableOrder();
      this.showMenu();
    }
  }

  async createTakeaway(): Promise<void> {
    await this.store.createOrder('TAKEAWAY');
    if (!this.store.operationErrorCode()) this.showMenu();
  }

  openOrder(orderId: string): void {
    this.store.selectOrder(orderId);
    this.showMenu();
  }

  showRoom(): void {
    this.mobileView.set('ROOM');
  }

  showMenu(): void {
    this.mobileView.set('MENU');
  }

  showOrder(): void {
    if (this.store.selectedOrder()) this.mobileView.set('ORDER');
  }

  chooseMenuItem(item: MenuItem): void {
    const order = this.store.selectedOrder();
    if (
      !order ||
      order.serverStatus === 'PAID' ||
      order.serverStatus === 'CANCELLED' ||
      order.localStatus === 'PENDING_SEND' ||
      this.store.operationPending()
    ) {
      return;
    }

    if (item.modifierGroups.length > 0) {
      this.modifierItem.set(item);
      this.selectedModifierOptionIds.set([]);
      this.modifierNote.set('');
      return;
    }

    void this.store.addItem(item.id);
  }

  closeModifierDialog(): void {
    this.modifierItem.set(null);
    this.selectedModifierOptionIds.set([]);
    this.modifierNote.set('');
  }

  toggleModifierOption(group: MenuItemModifierGroup, optionId: string): void {
    const selected = this.selectedModifierOptionIds();
    if (selected.includes(optionId)) {
      this.selectedModifierOptionIds.set(selected.filter((id) => id !== optionId));
      return;
    }

    if (selected.length < 20 && this.selectionCount(group) < group.maxSelections) {
      this.selectedModifierOptionIds.set([...selected, optionId]);
    }
  }

  isModifierSelected(optionId: string): boolean {
    return this.selectedModifierOptionIds().includes(optionId);
  }

  isModifierDisabled(group: MenuItemModifierGroup, optionId: string): boolean {
    return (
      !this.isModifierSelected(optionId) &&
      (this.selectedModifierOptionIds().length >= 20 || this.selectionCount(group) >= group.maxSelections)
    );
  }

  selectionCount(group: MenuItemModifierGroup): number {
    const optionIds = new Set(group.options.map(({ id }) => id));
    return this.selectedModifierOptionIds().filter((id) => optionIds.has(id)).length;
  }

  minimumSelections(group: MenuItemModifierGroup): number {
    return Math.max(group.minSelections, group.required ? 1 : 0);
  }

  async addConfiguredItem(): Promise<void> {
    const item = this.modifierItem();
    if (!item || !this.modifiersValid()) return;

    const note = this.modifierNote().trim();
    await this.store.addItem(item.id, this.selectedModifierOptionIds(), '1', note || undefined);
    if (!this.store.operationErrorCode()) this.closeModifierDialog();
  }

  changeLineQuantity(lineId: string, quantity: string, delta: number): void {
    const current = Number(quantity);
    if (!Number.isFinite(current)) return;

    const next = Math.max(1, current + delta);
    if (next !== current) void this.store.updateLine(lineId, { quantity: String(next) });
  }

  removeOpenLine(lineId: string): void {
    void this.store.removeOpenLine(lineId);
  }

  sendOrder(): void {
    void this.store.sendSelectedOrder();
  }

  openPayment(): void {
    if (this.canOpenPayment()) this.paymentVisible.set(true);
  }

  async addPayment(request: AddPaymentRequest): Promise<void> {
    await this.store.addPayment(request.method, request.amount, request.externalReference);
  }

  async finalizeOrder(): Promise<void> {
    await this.store.finalizeSelectedOrder();
    const order = this.store.selectedAuthoritativeOrder();
    if (!this.store.operationErrorCode() && order?.status === 'PAID') {
      this.paymentVisible.set(false);
      this.receiptOrder.set(order);
      this.store.selectOrder(null);
      this.showRoom();
    }
  }

  closeReceipt(): void {
    this.receiptOrder.set(null);
  }

  openVoidLine(lineId: string, lineName: string): void {
    this.voidLineId.set(lineId);
    this.voidLineName.set(lineName);
    this.voidReason.set('');
  }

  closeVoidLine(): void {
    this.voidLineId.set(null);
    this.voidLineName.set('');
    this.voidReason.set('');
  }

  async confirmVoidLine(): Promise<void> {
    const lineId = this.voidLineId();
    const reason = this.voidReason().trim();
    if (!lineId || reason.length < 3 || reason.length > 300) return;

    await this.store.voidSelectedOrderLine(lineId, reason);
    if (!this.store.operationErrorCode()) this.closeVoidLine();
  }

  orderStatus(order: PosOrderViewModel): string {
    return order.serverStatus ?? order.localStatus ?? 'DRAFT';
  }

  lineStatus(line: PosOrderLineViewModel): string {
    return line.serverStatus ?? 'OPEN';
  }

  orderTotal(order: PosOrderViewModel): string {
    return order.totalIsEstimated
      ? (order.estimatedTotalGross ?? order.authoritativeTotalGross ?? '0.00')
      : (order.authoritativeTotalGross ?? order.estimatedTotalGross ?? '0.00');
  }

  private bindConnectivity(): void {
    const sync = (): void => {
      this.online.set(typeof navigator === 'undefined' || navigator.onLine);
      this.store.connectivityChanged(this.online());
    };
    const syncIfVisible = (): void => {
      if (document.visibilityState === 'visible') sync();
    };

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', syncIfVisible);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', syncIfVisible);
    });
  }

  private async initializePairedTerminal(): Promise<void> {
    await this.deviceSession?.initialize();
    const device = this.deviceSession?.device();
    const operator = this.deviceSession?.operatorSession();
    if (!device || device.type !== 'REGISTER' || !operator) {
      this.store.errorCode.set('DEVICE_EMPLOYEE_SESSION_REQUIRED');
      return;
    }

    this.bindConnectivity();
    this.selectedDeviceId.set(device.id);
    await this.store.initialize(device.enterpriseId, 'DEVICE_EMPLOYEE');
    await this.store.activateDevice(device.id);
  }

  private async migrateLegacyDevice(devices: readonly PosDevice[]): Promise<void> {
    if (this.legacyMigrationAttempted || this.store.device()) return;
    this.legacyMigrationAttempted = true;
    const legacyDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!legacyDeviceId || !devices.some(({ id }) => id === legacyDeviceId)) return;

    this.selectedDeviceId.set(legacyDeviceId);
    await this.store.activateDevice(legacyDeviceId);
    if (this.store.device()?.id === legacyDeviceId && !this.store.errorCode()) {
      localStorage.removeItem(DEVICE_STORAGE_KEY);
    }
  }
}
