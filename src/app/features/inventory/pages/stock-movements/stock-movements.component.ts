import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Observable, finalize, forkJoin, map } from 'rxjs';

import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

import {
  InventorySummaryItem,
  InventorySummaryResponse,
  StockMovementType,
  StockMovementsResponse
} from '../../models/inventory.models';
import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [ButtonModule, CommonModule, FormsModule, SkeletonComponent, TableModule, TranslateModule],
  templateUrl: './stock-movements.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockMovementsComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly connectivity = inject(InventoryConnectivityService);

  readonly response = signal<StockMovementsResponse | null>(null);
  readonly products = signal<InventorySummaryItem[]>([]);
  readonly loading = signal(true);
  readonly errorCode = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly movementTypes: StockMovementType[] = [
    'OPENING',
    'PURCHASE',
    'SALE',
    'WASTE',
    'COUNT_ADJUSTMENT',
    'MANUAL_ADJUSTMENT',
    'PURCHASE_REVERSAL',
    'TRANSFER_IN',
    'TRANSFER_OUT'
  ];

  productId = '';
  type: StockMovementType | '' = '';
  from = '';
  to = '';
  page = 1;
  readonly limit = 50;

  ngOnInit(): void {
    this.load(true);
  }

  applyFilters(): void {
    this.page = 1;
    this.load(false);
  }

  clearFilters(): void {
    this.productId = '';
    this.type = '';
    this.from = '';
    this.to = '';
    this.page = 1;
    this.load(false);
  }

  previousPage(): void {
    if (this.page <= 1 || this.loading()) return;
    this.page--;
    this.load(false);
  }

  nextPage(): void {
    if (!this.hasNextPage() || this.loading()) return;
    this.page++;
    this.load(false);
  }

  hasNextPage(): boolean {
    const response = this.response();
    return !!response && response.page * response.limit < response.total;
  }

  load(includeProducts: boolean): void {
    if (!this.connectivity.online()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.errorCode.set(null);
    this.errorMessage.set(null);
    const filters = {
      ...(this.productId ? { enterpriseProductId: this.productId } : {}),
      ...(this.type ? { type: this.type } : {}),
      ...(this.from ? { from: this.localDayBoundary(this.from, false) } : {}),
      ...(this.to ? { to: this.localDayBoundary(this.to, true) } : {}),
      page: this.page,
      limit: this.limit
    };
    const request: Observable<{
      movements: StockMovementsResponse;
      summary?: InventorySummaryResponse;
    }> = includeProducts
      ? forkJoin({
          movements: this.inventoryService.listMovements(filters),
          summary: this.inventoryService.getSummary()
        })
      : this.inventoryService.listMovements(filters).pipe(map((movements) => ({ movements })));

    request
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.response.set(result.movements);
          if (result.summary) this.products.set(result.summary.items);
        },
        error: (error: unknown) => this.setError(error)
      });
  }

  errorText(): string {
    const code = this.errorCode();
    if (!code) return '';
    const key = `inventory.errors.${code}`;
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : (this.errorMessage() ?? code);
  }

  sourceLabel(sourceType: string): string {
    const key = `inventory.sources.${sourceType}`;
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : sourceType;
  }

  private localDayBoundary(value: string, endOfDay: boolean): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    ).toISOString();
  }

  private setError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
      this.errorCode.set('INVENTORY_MOVEMENTS_LOAD_FAILED');
      return;
    }
    const body = error.error as Record<string, unknown>;
    this.errorCode.set(typeof body['code'] === 'string' ? body['code'] : 'INVENTORY_MOVEMENTS_LOAD_FAILED');
    this.errorMessage.set(typeof body['message'] === 'string' ? body['message'] : null);
  }
}
