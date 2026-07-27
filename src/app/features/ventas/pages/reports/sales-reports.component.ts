import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { finalize, forkJoin, fromEvent } from 'rxjs';

import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

import {
  CashDeviationReport,
  DailySalesSummary,
  IncompleteCostsReport,
  PosCostStatus,
  SalesBreakdownReport,
  SalesByHourReport,
  SalesByPaymentMethodReport,
  SalesReportCostStatus
} from '../../models/pos.models';
import { DailySalesFilters, PosService } from '../../services/pos.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SalesReportsData {
  daily: DailySalesSummary;
  byItem: SalesBreakdownReport;
  byCategory: SalesBreakdownReport;
  byHour: SalesByHourReport;
  byPaymentMethod: SalesByPaymentMethodReport;
  cashDeviation: CashDeviationReport;
  incompleteCosts: IncompleteCostsReport;
}

interface ApiFailure {
  code: string;
  message: string | null;
}

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [ButtonModule, CommonModule, FormsModule, SkeletonComponent, TableModule, TranslateModule],
  templateUrl: './sales-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesReportsComponent implements OnInit {
  private readonly posService = inject(PosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly loading = signal(true);
  readonly filterInvalid = signal(false);
  readonly errorCode = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly reports = signal<SalesReportsData | null>(null);
  readonly activeHours = computed(() => this.reports()?.byHour.items.filter(({ orderCount }) => orderCount > 0) ?? []);

  date = localDate();
  deviceId = '';

  ngOnInit(): void {
    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.online.set(true);
        this.loadReports();
      });
    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.online.set(false));
    this.loadReports();
  }

  loadReports(): void {
    this.filterInvalid.set(!this.filtersValid());
    this.errorCode.set(null);
    this.errorMessage.set(null);
    if (!this.online() || this.filterInvalid()) {
      this.loading.set(false);
      return;
    }

    const filters = this.filters();
    this.loading.set(true);
    forkJoin({
      daily: this.posService.getDailySales(filters),
      byItem: this.posService.getSalesByItem(filters),
      byCategory: this.posService.getSalesByCategory(filters),
      byHour: this.posService.getSalesByHour(filters),
      byPaymentMethod: this.posService.getSalesByPaymentMethod(filters),
      cashDeviation: this.posService.getCashDeviation(filters),
      incompleteCosts: this.posService.getIncompleteCosts(filters)
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (reports) => this.reports.set(reports),
        error: (error: unknown) => {
          const failure = apiFailure(error);
          this.errorCode.set(failure.code);
          this.errorMessage.set(failure.message);
        }
      });
  }

  filtersValid(): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(this.date) && (!this.deviceId.trim() || UUID_PATTERN.test(this.deviceId.trim()));
  }

  hasActivity(): boolean {
    const reports = this.reports();
    return (
      !!reports &&
      (reports.daily.orderCount > 0 ||
        decimalIsNotZero(reports.daily.refundsGross) ||
        reports.byPaymentMethod.items.length > 0 ||
        reports.cashDeviation.sessionCount > 0 ||
        reports.incompleteCosts.itemCount > 0)
    );
  }

  costValue(value: string | null, status: SalesReportCostStatus | PosCostStatus): string | null {
    return status === 'CALCULATED' ? value : null;
  }

  private filters(): DailySalesFilters {
    return { date: this.date, deviceId: this.deviceId.trim() || undefined };
  }
}

function localDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function decimalIsNotZero(value: string): boolean {
  return !/^-?0+(?:\.0+)?$/.test(value);
}

function apiFailure(error: unknown): ApiFailure {
  if (typeof error !== 'object' || error === null) return { code: 'UNKNOWN', message: null };
  if ('code' in error && typeof error.code === 'string') return { code: error.code, message: message(error) };
  if ('error' in error && typeof error.error === 'object' && error.error !== null) {
    const response = error.error;
    if ('code' in response && typeof response.code === 'string') {
      return { code: response.code, message: message(response) };
    }
  }
  return { code: 'UNKNOWN', message: message(error) };
}

function message(value: object): string | null {
  if (!('message' in value)) return null;
  if (typeof value.message === 'string') return value.message;
  if (Array.isArray(value.message) && value.message.every((item) => typeof item === 'string')) {
    return value.message.join(' · ');
  }
  return null;
}
