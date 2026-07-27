import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import {
  CashDeviationReport,
  DailySalesSummary,
  IncompleteCostsReport,
  SalesBreakdownReport,
  SalesByHourReport,
  SalesByPaymentMethodReport
} from '../../models/pos.models';
import { PosService } from '../../services/pos.service';
import { SalesReportsComponent } from './sales-reports.component';

describe('SalesReportsComponent', () => {
  let fixture: ComponentFixture<SalesReportsComponent>;
  let component: SalesReportsComponent;
  let posService: jasmine.SpyObj<PosService>;

  beforeEach(() => {
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'getDailySales',
      'getSalesByItem',
      'getSalesByCategory',
      'getSalesByHour',
      'getSalesByPaymentMethod',
      'getCashDeviation',
      'getIncompleteCosts'
    ]);
    posService.getDailySales.and.returnValue(of(dailyReport()));
    posService.getSalesByItem.and.returnValue(of(breakdownReport()));
    posService.getSalesByCategory.and.returnValue(of(breakdownReport()));
    posService.getSalesByHour.and.returnValue(of(hourReport()));
    posService.getSalesByPaymentMethod.and.returnValue(of(paymentReport()));
    posService.getCashDeviation.and.returnValue(of(cashReport()));
    posService.getIncompleteCosts.and.returnValue(of(incompleteReport()));

    TestBed.configureTestingModule({
      imports: [SalesReportsComponent, TranslateModule.forRoot()],
      providers: [{ provide: PosService, useValue: posService }]
    });
    fixture = TestBed.createComponent(SalesReportsComponent);
    component = fixture.componentInstance;
  });

  it('requests every authoritative report with the same date and optional device', () => {
    fixture.detectChanges();
    const filters = { date: '2026-07-27', deviceId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4' };
    component.date = filters.date;
    component.deviceId = filters.deviceId;

    component.loadReports();

    expect(posService.getDailySales).toHaveBeenCalledWith(filters);
    expect(posService.getSalesByItem).toHaveBeenCalledWith(filters);
    expect(posService.getSalesByCategory).toHaveBeenCalledWith(filters);
    expect(posService.getSalesByHour).toHaveBeenCalledWith(filters);
    expect(posService.getSalesByPaymentMethod).toHaveBeenCalledWith(filters);
    expect(posService.getCashDeviation).toHaveBeenCalledWith(filters);
    expect(posService.getIncompleteCosts).toHaveBeenCalledWith(filters);
    expect(component.reports()?.daily.netSales).toBe('72.00');
  });

  it('never exposes a partial or failed cost as a zero value', () => {
    expect(component.costValue('0.0000', 'INCOMPLETE')).toBeNull();
    expect(component.costValue('0.0000', 'PENDING')).toBeNull();
    expect(component.costValue('0.0000', 'FAILED')).toBeNull();
    expect(component.costValue('14.2500', 'CALCULATED')).toBe('14.2500');
  });

  it('keeps only hours with orders in the operational table and validates device IDs', () => {
    fixture.detectChanges();

    expect(component.activeHours().map(({ hour }) => hour)).toEqual([13]);

    component.deviceId = 'not-a-uuid';
    expect(component.filtersValid()).toBeFalse();
    component.loadReports();
    expect(component.filterInvalid()).toBeTrue();
  });

  it('accepts authoritative empty reports without manufacturing activity', () => {
    posService.getDailySales.and.returnValue(
      of({ ...dailyReport(), orderCount: 0, refundsGross: '0.00', incompleteCostOrderCount: 0 })
    );
    posService.getSalesByItem.and.returnValue(of({ ...breakdownReport(), items: [] }));
    posService.getSalesByCategory.and.returnValue(of({ ...breakdownReport(), items: [] }));
    posService.getSalesByHour.and.returnValue(
      of({ ...hourReport(), items: hourReport().items.map((item) => ({ ...item, orderCount: 0 })) })
    );
    posService.getSalesByPaymentMethod.and.returnValue(of({ ...paymentReport(), items: [] }));
    posService.getIncompleteCosts.and.returnValue(of({ ...incompleteReport(), itemCount: 0, items: [] }));

    fixture.detectChanges();

    expect(component.hasActivity()).toBeFalse();
    expect(component.activeHours()).toEqual([]);
  });

  it('surfaces REPORT_TIMEZONE_INVALID by code and preserves its backend message', () => {
    posService.getDailySales.and.returnValue(
      throwError(() => ({ error: { code: 'REPORT_TIMEZONE_INVALID', message: 'Invalid business timezone' } }))
    );

    fixture.detectChanges();

    expect(component.errorCode()).toBe('REPORT_TIMEZONE_INVALID');
    expect(component.errorMessage()).toBe('Invalid business timezone');
    expect(component.loading()).toBeFalse();
  });
});

function dailyReport(): DailySalesSummary {
  return {
    date: '2026-07-27',
    currency: 'EUR',
    grossSales: '121.00',
    grossSalesBeforeDiscounts: '121.00',
    salesAfterDiscountsGross: '110.00',
    taxGross: '10.00',
    refundTaxGross: '1.00',
    netTaxGross: '9.00',
    discountGross: '11.00',
    refundsGross: '20.00',
    salesNet: '100.00',
    refundsNet: '19.00',
    netSales: '72.00',
    netSalesGross: '90.00',
    theoreticalCostNet: '0.00',
    netMargin: '0.00',
    marginAmount: '0.00',
    marginStatus: 'INCOMPLETE',
    incompleteCostOrderCount: 1,
    orderCount: 2,
    guestCount: 4,
    paymentsByMethod: { CASH: '50.00', CARD: '60.00', OTHER: '0.00' },
    accountingBasis: {
      sales: 'VAT_EXCLUDED_AFTER_REFUNDS',
      cost: 'HISTORICAL_RECIPE_COST_NET',
      margin: 'NET_SALES_MINUS_THEORETICAL_COST_NET'
    },
    timestampBasis: {
      sales: 'FISCAL_ISSUED_AT_FALLBACK_ORDER_CLOSED_AT',
      refunds: 'REFUND_CREATED_AT',
      cashDeviation: 'CASH_SESSION_CLOSED_AT'
    },
    cashSessions: []
  };
}

function breakdownReport(): SalesBreakdownReport {
  return {
    date: '2026-07-27',
    currency: 'EUR',
    items: [
      {
        id: 'item-1',
        name: 'Producto',
        quantity: '2.000',
        lineCount: 2,
        grossSalesBeforeDiscounts: '22.00',
        discountGross: '2.00',
        salesAfterDiscountsGross: '20.00',
        salesNet: '18.18',
        theoreticalCostNet: '0.0000',
        netMargin: '18.1800',
        costStatus: 'INCOMPLETE',
        incompleteCostLineCount: 1
      }
    ],
    accountingBasis: accountingBasis()
  };
}

function hourReport(): SalesByHourReport {
  const item = {
    hour: 12,
    label: '12:00',
    orderCount: 0,
    grossSalesBeforeDiscounts: '0.00',
    discountGross: '0.00',
    salesAfterDiscountsGross: '0.00',
    salesNet: '0.00',
    theoreticalCostNet: '0.0000',
    netMargin: '0.0000',
    costStatus: 'CALCULATED' as const,
    incompleteCostOrderCount: 0
  };
  return {
    date: '2026-07-27',
    currency: 'EUR',
    items: [item, { ...item, hour: 13, label: '13:00', orderCount: 2, salesNet: '100.00' }],
    accountingBasis: accountingBasis()
  };
}

function paymentReport(): SalesByPaymentMethodReport {
  return {
    date: '2026-07-27',
    currency: 'EUR',
    items: [
      {
        method: 'CARD',
        paymentCount: 2,
        refundCount: 1,
        paymentGross: '110.00',
        refundGross: '20.00',
        netCollectedGross: '90.00'
      }
    ]
  };
}

function cashReport(): CashDeviationReport {
  return { date: '2026-07-27', currency: 'EUR', sessionCount: 0, totalDifference: '0.00', items: [] };
}

function incompleteReport(): IncompleteCostsReport {
  return {
    date: '2026-07-27',
    currency: 'EUR',
    itemCount: 1,
    items: [
      {
        orderLineId: 'line-1',
        menuItemId: 'item-1',
        itemName: 'Producto',
        sku: null,
        costStatus: 'PENDING',
        estimatedCostNet: null,
        salesAfterDiscountsGross: '20.00',
        issueCodes: ['MISSING_RECIPE', 'COST_PENDING']
      }
    ],
    accountingBasis: accountingBasis()
  };
}

function accountingBasis() {
  return {
    sales: 'VAT_EXCLUDED' as const,
    cost: 'HISTORICAL_RECIPE_COST_NET' as const,
    margin: 'NET_SALES_MINUS_THEORETICAL_COST_NET' as const
  };
}
