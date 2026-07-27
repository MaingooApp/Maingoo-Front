import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { AppPermission } from '@core/constants/permissions.enum';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

import { isInventoryDecimal, subtractInventoryDecimals } from '../../models/inventory-decimal';
import {
  CompleteStockCountCommand,
  CompleteStockCountResponse,
  InventorySummaryItem,
  StockCount,
  StockCountLine
} from '../../models/inventory.models';
import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';
import { InventoryService } from '../../services/inventory.service';

const PAGE_SIZE = 50;
const MAX_COUNT_LINES = 500;

@Component({
  selector: 'app-stock-count',
  standalone: true,
  imports: [ButtonModule, CommonModule, FormsModule, InputTextModule, SkeletonComponent, TranslateModule],
  templateUrl: './stock-count.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockCountComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly permissions = inject(NgxPermissionsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly connectivity = inject(InventoryConnectivityService);
  readonly products = signal<InventorySummaryItem[]>([]);
  readonly count = signal<StockCount | CompleteStockCountResponse | null>(null);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly search = signal('');
  readonly visibleLimit = signal(PAGE_SIZE);
  readonly countSearch = signal('');
  readonly countVisibleLimit = signal(PAGE_SIZE);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly confirming = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly ambiguousCreate = signal(false);
  readonly completeIntent = signal<CompleteStockCountCommand | null>(null);
  readonly canWrite = !!this.permissions.getPermission(AppPermission.InventoryWrite);

  readonly filteredProducts = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    return this.products().filter(({ name }) => !search || name.toLocaleLowerCase().includes(search));
  });
  readonly visibleProducts = computed(() => this.filteredProducts().slice(0, this.visibleLimit()));
  readonly filteredCountLines = computed(() => {
    const count = this.count();
    if (!count) return [];
    const search = this.countSearch().trim().toLocaleLowerCase();
    return count.lines.filter(
      (line) => !search || this.productName(line.enterpriseProductId).toLocaleLowerCase().includes(search)
    );
  });
  readonly visibleCountLines = computed(() => this.filteredCountLines().slice(0, this.countVisibleLimit()));

  note = '';
  readonly counted: Record<string, string> = {};

  get busy(): boolean {
    return this.submitting() || this.confirming();
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    if (!this.connectivity.online()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.clearError();
    this.inventoryService
      .getSummary()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ items }) => this.products.set(items),
        error: (error: unknown) => this.setError(error, 'INVENTORY_SUMMARY_LOAD_FAILED')
      });
  }

  searchChanged(value: string): void {
    this.search.set(value.slice(0, 100));
    this.visibleLimit.set(PAGE_SIZE);
  }

  countSearchChanged(value: string): void {
    this.countSearch.set(value.slice(0, 100));
    this.countVisibleLimit.set(PAGE_SIZE);
  }

  loadMoreProducts(): void {
    this.visibleLimit.update((limit) => limit + PAGE_SIZE);
  }

  loadMoreCountLines(): void {
    this.countVisibleLimit.update((limit) => limit + PAGE_SIZE);
  }

  toggleProduct(productId: string): void {
    const selected = new Set(this.selectedIds());
    if (selected.has(productId)) selected.delete(productId);
    else if (selected.size < MAX_COUNT_LINES) selected.add(productId);
    this.selectedIds.set(selected);
  }

  selectVisible(): void {
    const selected = new Set(this.selectedIds());
    for (const product of this.visibleProducts()) {
      if (selected.size >= MAX_COUNT_LINES) break;
      selected.add(product.enterpriseProductId);
    }
    this.selectedIds.set(selected);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  async createCount(): Promise<void> {
    const selected = [...this.selectedIds()];
    if (
      !this.canWrite ||
      !this.connectivity.online() ||
      this.busy ||
      this.ambiguousCreate() ||
      selected.length === 0 ||
      selected.length > MAX_COUNT_LINES ||
      this.note.length > 500
    ) {
      return;
    }

    this.confirming.set(true);
    let confirmed = false;
    try {
      confirmed = await this.confirmDialog.confirm({
        header: this.translate.instant('inventory.count.confirmCreateHeader'),
        message: this.translate.instant('inventory.count.confirmCreateMessage', { count: selected.length }),
        acceptLabel: this.translate.instant('inventory.count.confirmCreateAccept'),
        rejectLabel: this.translate.instant('inventory.actions.cancel'),
        icon: 'help'
      });
    } finally {
      this.confirming.set(false);
    }
    if (!confirmed || this.busy) return;

    this.submitting.set(true);
    this.clearError();
    this.inventoryService
      .createCount({
        enterpriseProductIds: selected,
        ...(this.note.trim() ? { note: this.note.trim() } : {})
      })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (count) => {
          this.count.set(count);
          count.lines.forEach((line) => (this.counted[line.enterpriseProductId] = ''));
          this.countVisibleLimit.set(PAGE_SIZE);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 0) this.ambiguousCreate.set(true);
          this.setError(error, 'INVENTORY_COUNT_CREATE_FAILED');
        }
      });
  }

  allLinesValid(): boolean {
    const count = this.count();
    return !!count && count.lines.length > 0 && count.lines.every((line) => this.countedValueValid(line));
  }

  countedValueValid(line: StockCountLine): boolean {
    const value = line.countedBaseQuantity ?? this.counted[line.enterpriseProductId] ?? '';
    return isInventoryDecimal(value, false);
  }

  difference(line: StockCountLine): string | null {
    if (line.differenceBaseQuantity !== null) return line.differenceBaseQuantity;
    const counted = this.counted[line.enterpriseProductId] ?? '';
    return isInventoryDecimal(counted, false) ? subtractInventoryDecimals(counted, line.expectedBaseQuantity) : null;
  }

  async completeCount(): Promise<void> {
    const count = this.count();
    if (
      !count ||
      count.status !== 'DRAFT' ||
      !this.canWrite ||
      !this.connectivity.online() ||
      this.busy ||
      this.errorCode() === 'STOCK_CHANGED_DURING_COUNT' ||
      !this.allLinesValid()
    ) {
      return;
    }

    const command: CompleteStockCountCommand = {
      lines: count.lines.map((line) => ({
        enterpriseProductId: line.enterpriseProductId,
        countedBaseQuantity: this.counted[line.enterpriseProductId]
      }))
    };
    this.confirming.set(true);
    let confirmed = false;
    try {
      confirmed = await this.confirmDialog.confirm({
        header: this.translate.instant('inventory.count.confirmCompleteHeader'),
        message: this.translate.instant('inventory.count.confirmCompleteMessage', { count: command.lines.length }),
        acceptLabel: this.translate.instant('inventory.count.confirmCompleteAccept'),
        rejectLabel: this.translate.instant('inventory.actions.cancel'),
        icon: 'warning'
      });
    } finally {
      this.confirming.set(false);
    }
    if (!confirmed || this.busy) return;

    this.completeIntent.set(command);
    this.executeCompletion(count.id, command);
  }

  retryCompletion(): void {
    const count = this.count();
    const command = this.completeIntent();
    if (
      count?.status === 'DRAFT' &&
      command &&
      this.connectivity.online() &&
      !this.busy &&
      this.errorCode() !== 'STOCK_CHANGED_DURING_COUNT'
    ) {
      this.executeCompletion(count.id, command);
    }
  }

  startNewCount(): void {
    if (this.busy) return;
    this.count.set(null);
    this.completeIntent.set(null);
    this.ambiguousCreate.set(false);
    this.note = '';
    this.clearSelection();
    this.clearError();
    for (const key of Object.keys(this.counted)) delete this.counted[key];
  }

  productName(productId: string): string {
    return this.products().find(({ enterpriseProductId }) => enterpriseProductId === productId)?.name ?? productId;
  }

  errorText(): string {
    const code = this.errorCode();
    if (!code) return '';
    const key = `inventory.errors.${code}`;
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : (this.errorMessage() ?? code);
  }

  private executeCompletion(countId: string, command: CompleteStockCountCommand): void {
    if (this.busy) return;
    this.submitting.set(true);
    this.clearError(false);
    this.inventoryService
      .completeCount(countId, command)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (completed) => {
          this.count.set(completed);
          this.completeIntent.set(null);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
            this.completeIntent.set(null);
          }
          this.setError(error, 'INVENTORY_COUNT_COMPLETE_FAILED');
        }
      });
  }

  private clearError(clearIntent = true): void {
    this.errorCode.set(null);
    this.errorMessage.set(null);
    if (clearIntent) this.completeIntent.set(null);
  }

  private setError(error: unknown, fallback: string): void {
    if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
      this.errorCode.set(fallback);
      return;
    }
    const body = error.error as Record<string, unknown>;
    this.errorCode.set(typeof body['code'] === 'string' ? body['code'] : fallback);
    this.errorMessage.set(typeof body['message'] === 'string' ? body['message'] : null);
  }
}
