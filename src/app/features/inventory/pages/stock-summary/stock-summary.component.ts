import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { finalize } from 'rxjs';

import { AppPermission } from '@core/constants/permissions.enum';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

import { StockAdjustmentDialogComponent } from '../../components/stock-adjustment-dialog/stock-adjustment-dialog.component';
import { InventorySummaryItem, InventorySummaryResponse } from '../../models/inventory.models';
import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';
import { InventoryService } from '../../services/inventory.service';

type StockStatus = 'NORMAL' | 'LOW' | 'NEGATIVE' | 'REVIEW';

@Component({
  selector: 'app-stock-summary',
  standalone: true,
  imports: [
    ButtonModule,
    CommonModule,
    FormsModule,
    InputTextModule,
    SkeletonComponent,
    StockAdjustmentDialogComponent,
    TableModule,
    TranslateModule
  ],
  templateUrl: './stock-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockSummaryComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly permissions = inject(NgxPermissionsService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly connectivity = inject(InventoryConnectivityService);
  readonly response = signal<InventorySummaryResponse | null>(null);
  readonly loading = signal(true);
  readonly errorCode = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly adjustmentProduct = signal<InventorySummaryItem | null>(null);
  readonly adjustmentVisible = signal(false);
  readonly movementApplied = signal(false);
  readonly canWrite = !!this.permissions.getPermission(AppPermission.InventoryWrite);

  search = '';
  lowStockOnly = false;
  includeInactive = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.connectivity.online()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.errorCode.set(null);
    this.errorMessage.set(null);
    this.inventoryService
      .getSummary({
        ...(this.search.trim() ? { search: this.search.trim() } : {}),
        ...(this.lowStockOnly ? { lowStockOnly: true } : {}),
        ...(this.includeInactive ? { includeInactive: true } : {})
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: (error: unknown) => this.setError(error)
      });
  }

  clearFilters(): void {
    this.search = '';
    this.lowStockOnly = false;
    this.includeInactive = false;
    this.load();
  }

  openAdjustment(product: InventorySummaryItem): void {
    if (!this.canWrite) return;
    this.adjustmentProduct.set(product);
    this.adjustmentVisible.set(true);
    this.movementApplied.set(false);
  }

  adjustmentClosed(visible: boolean): void {
    this.adjustmentVisible.set(visible);
    if (!visible) this.adjustmentProduct.set(null);
  }

  movementCompleted(): void {
    this.movementApplied.set(true);
    this.adjustmentVisible.set(false);
    this.adjustmentProduct.set(null);
    this.load();
  }

  status(item: InventorySummaryItem): StockStatus {
    if (item.stockBaseQuantity.startsWith('-') && !/^-0(?:\.0+)?$/.test(item.stockBaseQuantity)) return 'NEGATIVE';
    if (item.needsManualReview) return 'REVIEW';
    if (item.isLowStock) return 'LOW';
    return 'NORMAL';
  }

  statusClasses(status: StockStatus): string {
    return {
      NORMAL: 'border-green-500 text-green-700 dark:text-green-300',
      LOW: 'border-orange-500 text-orange-700 dark:text-orange-300',
      NEGATIVE: 'border-red-500 text-red-700 dark:text-red-300',
      REVIEW: 'border-purple-500 text-purple-700 dark:text-purple-300'
    }[status];
  }

  errorText(): string {
    const code = this.errorCode();
    if (!code) return '';
    const key = `inventory.errors.${code}`;
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : (this.errorMessage() ?? code);
  }

  private setError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
      this.errorCode.set('INVENTORY_SUMMARY_LOAD_FAILED');
      return;
    }
    const body = error.error as Record<string, unknown>;
    this.errorCode.set(typeof body['code'] === 'string' ? body['code'] : 'INVENTORY_SUMMARY_LOAD_FAILED');
    this.errorMessage.set(typeof body['message'] === 'string' ? body['message'] : null);
  }
}
