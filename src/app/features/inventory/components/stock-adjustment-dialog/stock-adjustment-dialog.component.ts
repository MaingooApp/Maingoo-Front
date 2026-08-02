import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { AppPermission } from '@core/constants/permissions.enum';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { randomUuid } from '@shared/helpers/random-uuid';

import {
  addInventoryDecimals,
  isNonZeroInventoryDecimal,
  negateInventoryDecimal
} from '../../models/inventory-decimal';
import { ApplyInventoryMovementCommand, InventorySummaryItem, StockMovement } from '../../models/inventory.models';
import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';
import { InventoryService } from '../../services/inventory.service';

type AdjustmentType = ApplyInventoryMovementCommand['type'];
interface MovementIntent {
  command: ApplyInventoryMovementCommand;
}

const REASONS: Record<AdjustmentType, string[]> = {
  WASTE: ['EXPIRED', 'DAMAGED', 'SPILLAGE', 'OTHER_WASTE'],
  MANUAL_ADJUSTMENT: ['CORRECTION', 'FOUND_STOCK', 'OTHER_ADJUSTMENT']
};

@Component({
  selector: 'app-stock-adjustment-dialog',
  standalone: true,
  imports: [ButtonModule, DialogModule, FormsModule, InputTextModule, TranslateModule],
  templateUrl: './stock-adjustment-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockAdjustmentDialogComponent implements OnChanges {
  private readonly inventoryService = inject(InventoryService);
  private readonly connectivity = inject(InventoryConnectivityService);
  private readonly permissions = inject(NgxPermissionsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() visible = false;
  @Input({ required: true }) product: InventorySummaryItem | null = null;
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly applied = new EventEmitter<StockMovement>();

  readonly submitting = signal(false);
  readonly confirming = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly intent = signal<MovementIntent | null>(null);
  readonly canWrite = !!this.permissions.getPermission(AppPermission.InventoryWrite);
  readonly online = this.connectivity.online;

  type: AdjustmentType = 'WASTE';
  quantity = '';
  reasonCode = REASONS.WASTE[0];
  note = '';

  get reasons(): string[] {
    return REASONS[this.type];
  }

  get busy(): boolean {
    return this.submitting() || this.confirming();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true || changes['product']) this.reset();
  }

  typeChanged(): void {
    this.reasonCode = this.reasons[0];
    this.quantity = '';
    this.intent.set(null);
  }

  quantityValid(): boolean {
    return (
      isNonZeroInventoryDecimal(this.quantity, this.type === 'MANUAL_ADJUSTMENT') &&
      (this.type !== 'WASTE' || !this.quantity.startsWith('-'))
    );
  }

  previewBalance(): string | null {
    if (!this.product || !this.quantityValid()) return null;
    return addInventoryDecimals(this.product.stockBaseQuantity, this.signedQuantity());
  }

  close(): void {
    if (!this.busy) this.visibleChange.emit(false);
  }

  async submit(): Promise<void> {
    const product = this.product;
    if (!product || !this.canWrite || !this.online() || !this.quantityValid() || this.busy) return;

    this.confirming.set(true);
    let confirmed = false;
    try {
      confirmed = await this.confirmDialog.confirm({
        header: this.translate.instant('inventory.adjustment.confirmHeader'),
        message: this.translate.instant('inventory.adjustment.confirmMessage', {
          product: product.name,
          quantity: this.signedQuantity(),
          unit: product.stockBaseUnit
        }),
        acceptLabel: this.translate.instant('inventory.adjustment.confirmAccept'),
        rejectLabel: this.translate.instant('inventory.actions.cancel'),
        icon: 'warning'
      });
    } finally {
      this.confirming.set(false);
    }
    if (!confirmed || this.busy) return;

    this.execute({
      command: {
        enterpriseProductId: product.enterpriseProductId,
        type: this.type,
        quantityBase: this.signedQuantity(),
        baseUnit: product.stockBaseUnit,
        idempotencyKey: randomUuid(),
        reasonCode: this.reasonCode,
        ...(this.note.trim() ? { note: this.note.trim() } : {})
      }
    });
  }

  retry(): void {
    const intent = this.intent();
    if (intent && this.online() && !this.busy) this.execute(intent);
  }

  errorText(): string {
    const code = this.errorCode();
    if (!code) return '';
    const key = `inventory.errors.${code}`;
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : (this.errorMessage() ?? code);
  }

  private signedQuantity(): string {
    return this.type === 'WASTE' ? negateInventoryDecimal(this.quantity) : this.quantity;
  }

  private execute(intent: MovementIntent): void {
    if (this.busy) return;
    this.intent.set(intent);
    this.errorCode.set(null);
    this.errorMessage.set(null);
    this.submitting.set(true);

    this.inventoryService
      .applyMovement(intent.command)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (movement) => {
          this.intent.set(null);
          this.applied.emit(movement);
          this.visibleChange.emit(false);
        },
        error: (error: unknown) => this.setError(error)
      });
  }

  private reset(): void {
    this.type = 'WASTE';
    this.quantity = '';
    this.reasonCode = REASONS.WASTE[0];
    this.note = '';
    this.intent.set(null);
    this.errorCode.set(null);
    this.errorMessage.set(null);
  }

  private setError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
      this.errorCode.set('INVENTORY_MOVEMENT_FAILED');
      return;
    }
    const body = error.error as Record<string, unknown>;
    this.errorCode.set(typeof body['code'] === 'string' ? body['code'] : 'INVENTORY_MOVEMENT_FAILED');
    this.errorMessage.set(typeof body['message'] === 'string' ? body['message'] : null);
  }
}
