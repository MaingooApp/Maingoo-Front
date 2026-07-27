import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { CashSession, OperationalPosOrder, PaymentMethod, PosOrder } from '../../models/pos.models';

export interface OpenCashRequest {
  openingAmount: string;
}

export interface AddPaymentRequest {
  method: PaymentMethod;
  amount: string;
  externalReference?: string;
}

export type PaymentBlockedReason = 'OFFLINE' | 'PENDING_SYNC';

const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;
const ZERO_PATTERN = /^0(?:\.0+)?$/;

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [ButtonModule, DialogModule, FormsModule, InputTextModule, TranslateModule],
  templateUrl: './payment-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentDialogComponent implements OnChanges {
  private readonly translate = inject(TranslateService);
  @Input() visible = false;
  @Input({ required: true }) order: OperationalPosOrder | PosOrder | null = null;
  @Input({ required: true }) balance = '0.00';
  @Input() cashSession: CashSession | null = null;
  @Input() canOpenCash = false;
  @Input() loading = false;
  @Input() errorCode: string | null = null;
  @Input() blockedReason: PaymentBlockedReason | null = null;

  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly openCash = new EventEmitter<OpenCashRequest>();
  @Output() readonly addPayment = new EventEmitter<AddPaymentRequest>();
  @Output() readonly finalize = new EventEmitter<void>();

  readonly methods: PaymentMethod[] = ['CASH', 'CARD', 'OTHER'];
  openingAmount = '0.00';
  method: PaymentMethod = 'CASH';
  amount = '';
  externalReference = '';
  submitting = false;

  get busy(): boolean {
    return this.loading || this.submitting;
  }

  get fullyPaid(): boolean {
    return ZERO_PATTERN.test(this.balance);
  }

  get hasOpenCashSession(): boolean {
    return this.cashSession?.status === 'OPEN';
  }

  get cashChange(): string {
    if (this.method !== 'CASH' || !MONEY_PATTERN.test(this.amount) || !MONEY_PATTERN.test(this.balance)) return '0.00';

    const change = toCents(this.amount) - toCents(this.balance);
    return fromCents(change > 0n ? change : 0n);
  }

  get canFinalize(): boolean {
    return !!this.order && this.fullyPaid && !this.busy && !this.blockedReason;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true || changes['order'] || changes['balance']) {
      this.amount = this.fullyPaid ? '' : this.balance;
    }
    if (
      changes['visible']?.currentValue === false ||
      changes['errorCode']?.currentValue ||
      (changes['loading']?.previousValue === true && changes['loading'].currentValue === false)
    ) {
      this.submitting = false;
    }
  }

  close(): void {
    if (!this.busy) this.visibleChange.emit(false);
  }

  submitOpenCash(form: NgForm): void {
    if (this.blockedReason || this.busy || form.invalid || !MONEY_PATTERN.test(this.openingAmount)) {
      form.control.markAllAsTouched();
      return;
    }
    if (!window.confirm(this.translate.instant('pos.payment.confirmOpenCash', { amount: this.openingAmount }))) return;

    this.submitting = true;
    this.openCash.emit({ openingAmount: this.openingAmount });
  }

  submitPayment(form: NgForm): void {
    if (this.blockedReason || this.busy || form.invalid || !this.isPositiveMoney(this.amount)) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const externalReference = this.externalReference.trim();
    this.addPayment.emit({
      method: this.method,
      amount: this.amount,
      ...(externalReference ? { externalReference } : {})
    });
  }

  submitFinalize(): void {
    if (!this.canFinalize) return;
    this.submitting = true;
    this.finalize.emit();
  }

  private isPositiveMoney(value: string): boolean {
    return MONEY_PATTERN.test(value) && !ZERO_PATTERN.test(value);
  }
}

function toCents(value: string): bigint {
  const [whole, decimals = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
}

function fromCents(value: bigint): string {
  const digits = value.toString().padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}
