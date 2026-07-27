import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import {
  AddPaymentRequest,
  OpenCashRequest,
  PaymentDialogComponent
} from '../../components/payment/payment-dialog.component';
import { ReceiptViewComponent } from '../../components/payment/receipt-view.component';
import {
  DiningTable,
  MenuItem,
  MenuItemModifierGroup,
  OperationalPosOrder,
  PosDevice,
  PosOrder
} from '../../models/pos.models';
import { PosSessionStore } from '../../services/pos-session.store';
import { PosService } from '../../services/pos.service';
import { AppPermission } from '@core/constants/permissions.enum';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

// ponytail: F1 stores only the non-secret device ID; F5 migrates it to the tenant-scoped IndexedDB store.
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
export class PosTerminalComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly posService = inject(PosService);
  private readonly permissions = inject(NgxPermissionsService);

  readonly store = inject(PosSessionStore);
  readonly devices = signal<PosDevice[]>([]);
  readonly loadingDevices = signal(false);
  readonly deviceListError = signal(false);
  readonly selectedDeviceId = signal('');
  readonly canManageDevices = !!this.permissions.getPermission(AppPermission.PosManage);
  readonly selectedAreaId = signal<string | null>(null);
  readonly selectedCategoryId = signal<string | null>(null);
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
  readonly canOpenCash = !!this.permissions.getPermission(AppPermission.PosCash);
  readonly canReadFiscal = !!this.permissions.getPermission(AppPermission.FiscalRead);
  readonly canVoidLines = !!this.permissions.getPermission(AppPermission.PosVoid);

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
      .sort((left, right) => left.orderNumber - right.orderNumber)
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
  readonly canSendOrder = computed(
    () =>
      this.store.selectedOrder()?.status !== 'PAID' &&
      this.store.selectedOrder()?.status !== 'CANCELLED' &&
      (this.store.selectedOrder()?.lines.some(({ status }) => status === 'OPEN') ?? false)
  );
  readonly canOpenPayment = computed(() => {
    const order = this.store.selectedOrder();
    const activeLines = order?.lines.filter(({ status }) => status !== 'VOIDED') ?? [];
    return (
      !!order &&
      order.status !== 'PAID' &&
      order.status !== 'CANCELLED' &&
      activeLines.length > 0 &&
      activeLines.every(({ status }) => status === 'SENT')
    );
  });
  readonly receiptFiscalDocument = computed(() => this.receiptOrder()?.fiscalDocuments.at(-1) ?? null);
  readonly receiptStockSyncStatus = computed(() => {
    const orderId = this.receiptOrder()?.id;
    if (!orderId) return null;

    const storedOrder = this.store.orders().find(({ id }) => id === orderId);
    if (storedOrder && 'stockSyncJob' in storedOrder) return storedOrder.stockSyncJob?.status ?? null;
    return this.store.stockSyncJobs().find((job) => job.orderId === orderId)?.status ?? null;
  });

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
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
          this.devices.set(devices);
          const savedDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
          if (savedDeviceId && devices.some(({ id }) => id === savedDeviceId)) {
            this.selectedDeviceId.set(savedDeviceId);
            void this.store.load(savedDeviceId);
          } else if (savedDeviceId) {
            localStorage.removeItem(DEVICE_STORAGE_KEY);
          }
        },
        error: () => this.deviceListError.set(true)
      });
  }

  activateDevice(): void {
    const deviceId = this.selectedDeviceId();
    if (!deviceId) return;

    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    void this.store.load(deviceId);
  }

  changeDevice(): void {
    localStorage.removeItem(DEVICE_STORAGE_KEY);
    this.selectedDeviceId.set('');
    this.store.reset();
  }

  tableOrder(tableId: string): OperationalPosOrder | PosOrder | undefined {
    return this.activeOrderByTable().get(tableId);
  }

  openTable(table: DiningTable): void {
    const order = this.tableOrder(table.id);
    if (order) {
      this.store.selectOrder(order.id);
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
    if (!this.store.operationErrorCode()) this.closeNewTableOrder();
  }

  createTakeaway(): void {
    void this.store.createOrder('TAKEAWAY');
  }

  chooseMenuItem(item: MenuItem): void {
    const order = this.store.selectedOrder();
    if (!order || order.status === 'PAID' || order.status === 'CANCELLED' || this.store.operationPending()) return;

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

  async openCash(request: OpenCashRequest): Promise<void> {
    await this.store.openCashSession(request.openingAmount);
  }

  async addPayment(request: AddPaymentRequest): Promise<void> {
    await this.store.addPayment(request.method, request.amount, request.externalReference);
  }

  async finalizeOrder(): Promise<void> {
    await this.store.finalizeSelectedOrder();
    const order = this.store.selectedOrder();
    if (!this.store.operationErrorCode() && order?.status === 'PAID') {
      this.paymentVisible.set(false);
      this.receiptOrder.set(order);
      this.store.selectOrder(null);
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
}
