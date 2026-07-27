import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import QRCode from 'qrcode';

import {
  FiscalDocument,
  FiscalReceipt,
  FiscalRecordSummary,
  FiscalSubmissionStatus,
  OperationalPosOrder,
  PosOrder,
  StockSyncJobStatus
} from '../../models/pos.models';
import { PosService } from '../../services/pos.service';
import { ReceiptPrintService } from '../../services/receipt-print.service';

type ReceiptDocument = FiscalDocument | FiscalReceipt | OperationalPosOrder['fiscalDocuments'][number];

interface ReceiptTaxRow {
  rate: string;
  base: string;
  tax: string;
  total: string;
}

@Component({
  selector: 'app-receipt-view',
  standalone: true,
  imports: [ButtonModule, DatePipe, TranslateModule],
  templateUrl: './receipt-view.component.html',
  styleUrl: './receipt-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptViewComponent implements OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly posService = inject(PosService);
  private readonly printer = inject(ReceiptPrintService);
  private receiptRequestId = 0;
  private qrRequestId = 0;

  @Input({ required: true }) order: OperationalPosOrder | PosOrder | null = null;
  @Input() fiscalDocument: ReceiptDocument | null = null;
  @Input() canReadFiscal = false;
  @Input() fiscalStatus: FiscalSubmissionStatus | null = null;
  @Input() stockSyncStatus: StockSyncJobStatus | null = null;
  @Input() currency = 'EUR';
  @Input() footer: string | null = null;

  readonly receipt = signal<ReceiptDocument | null>(null);
  readonly qrDataUrl = signal<string | null>(null);
  readonly documentLabel = computed(() => {
    const document = this.receipt();
    return document && 'label' in document ? document.label : null;
  });
  readonly documentNumber = computed(() => {
    const document = this.receipt();
    return document && 'documentNumber' in document
      ? document.documentNumber
      : document
        ? `${document.series}/${document.number}`
        : null;
  });
  readonly issuer = computed(() => {
    const document = this.receipt();
    return document && 'issuerLegalName' in document
      ? {
          legalName: document.issuerLegalName,
          taxId: document.issuerTaxId,
          fiscalAddress: document.issuerFiscalAddress
        }
      : null;
  });
  readonly taxRows = computed(() => {
    const breakdown = this.receipt()?.taxBreakdown;
    return Array.isArray(breakdown) ? breakdown.filter(isReceiptTaxRow) : [];
  });
  readonly records = computed<FiscalRecordSummary[]>(() => {
    const document = this.receipt();
    return document && 'records' in document ? document.records : [];
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fiscalDocument'] || changes['order'] || changes['canReadFiscal']) {
      this.resolveFiscalDocument();
    }
  }

  print(): void {
    this.printer.print();
  }

  private resolveFiscalDocument(): void {
    const requestId = ++this.receiptRequestId;
    const document = this.fiscalDocument;
    this.receipt.set(document);
    this.renderQr(document?.qrPayload ?? null);

    if (!document || !this.canReadFiscal || this.isFiscalReceipt(document)) return;

    this.posService
      .getReceipt(document.id, this.order?.enterpriseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (receipt) => {
          if (requestId !== this.receiptRequestId) return;
          this.receipt.set(receipt);
          this.renderQr(receipt.qrPayload);
        },
        error: () => {
          // The operational summary remains printable when the detail endpoint is unavailable.
        }
      });
  }

  private isFiscalReceipt(document: ReceiptDocument): document is FiscalReceipt {
    return 'label' in document && 'documentNumber' in document && 'records' in document;
  }

  private renderQr(payload: string | null): void {
    const requestId = ++this.qrRequestId;
    this.qrDataUrl.set(null);
    if (!payload) return;

    void QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 192 })
      .then((url) => {
        if (requestId === this.qrRequestId) this.qrDataUrl.set(url);
      })
      .catch(() => {
        if (requestId === this.qrRequestId) this.qrDataUrl.set(null);
      });
  }
}

function isReceiptTaxRow(value: unknown): value is ReceiptTaxRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return ['rate', 'base', 'tax', 'total'].every((key) => typeof row[key] === 'string');
}
