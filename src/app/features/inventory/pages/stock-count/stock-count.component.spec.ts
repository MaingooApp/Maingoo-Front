import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { of, throwError } from 'rxjs';

import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';

import { CompleteStockCountResponse, InventorySummaryResponse, StockCount } from '../../models/inventory.models';
import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';
import { InventoryService } from '../../services/inventory.service';
import { StockCountComponent } from './stock-count.component';

describe('StockCountComponent', () => {
  let component: StockCountComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', [
      'getSummary',
      'createCount',
      'completeCount'
    ]);
    inventoryService.getSummary.and.returnValue(of(summary));
    const confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    confirmDialog.confirm.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [StockCountComponent, TranslateModule.forRoot()],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: InventoryConnectivityService, useValue: { online: () => true } },
        { provide: NgxPermissionsService, useValue: { getPermission: () => ({}) } },
        provideNoopAnimations()
      ]
    });

    const fixture = TestBed.createComponent(StockCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.count.set(draftCount);
    component.counted[draftCount.lines[0].enterpriseProductId] = '9007199254740993.125';
    component.counted[draftCount.lines[1].enterpriseProductId] = '2.500';
  });

  it('submits every count line exactly and keeps stock-change conflicts persistent', async () => {
    inventoryService.completeCount.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'STOCK_CHANGED_DURING_COUNT', message: 'changed' }
          })
      )
    );

    expect(component.difference(draftCount.lines[0])).toBe('9007199254740992.125');
    await component.completeCount();

    const command = inventoryService.completeCount.calls.mostRecent().args[1];
    expect(command.lines).toEqual([
      { enterpriseProductId: 'product-1', countedBaseQuantity: '9007199254740993.125' },
      { enterpriseProductId: 'product-2', countedBaseQuantity: '2.500' }
    ]);
    expect(component.errorCode()).toBe('STOCK_CHANGED_DURING_COUNT');
    component.retryCompletion();
    expect(inventoryService.completeCount).toHaveBeenCalledTimes(1);
  });

  it('replaces the draft with the authoritative completed count and cannot complete twice', async () => {
    inventoryService.completeCount.and.returnValue(of(completedCount));

    await component.completeCount();
    await component.completeCount();

    expect(component.count()).toEqual(completedCount);
    expect(component.count()?.status).toBe('COMPLETED');
    expect(inventoryService.completeCount).toHaveBeenCalledTimes(1);
  });
});

const summary: InventorySummaryResponse = {
  items: [
    {
      enterpriseProductId: 'product-1',
      productBaseId: 'base-1',
      name: 'Harina',
      stockBaseQuantity: '1',
      stockBaseUnit: 'g',
      minimumStockBase: null,
      stockUpdatedAt: null,
      isLowStock: false,
      needsManualReview: false,
      stockValue: null
    },
    {
      enterpriseProductId: 'product-2',
      productBaseId: 'base-2',
      name: 'Leche',
      stockBaseQuantity: '2',
      stockBaseUnit: 'ml',
      minimumStockBase: null,
      stockUpdatedAt: null,
      isLowStock: false,
      needsManualReview: false,
      stockValue: null
    }
  ],
  totals: { products: 2, lowStock: 0, needsManualReview: 0 }
};

const draftCount: StockCount = {
  id: 'count-1',
  enterpriseId: 'enterprise-1',
  status: 'DRAFT',
  startedByUserId: 'user-1',
  completedByUserId: null,
  note: null,
  startedAt: '2026-07-27T08:00:00.000Z',
  completedAt: null,
  lines: [
    {
      id: 'line-1',
      enterpriseProductId: 'product-1',
      expectedBaseQuantity: '1',
      countedBaseQuantity: null,
      differenceBaseQuantity: null,
      baseUnit: 'g'
    },
    {
      id: 'line-2',
      enterpriseProductId: 'product-2',
      expectedBaseQuantity: '2',
      countedBaseQuantity: null,
      differenceBaseQuantity: null,
      baseUnit: 'ml'
    }
  ]
};

const completedCount: CompleteStockCountResponse = {
  ...draftCount,
  status: 'COMPLETED',
  completedByUserId: 'user-1',
  completedAt: '2026-07-27T09:00:00.000Z',
  lines: draftCount.lines.map((line) => ({
    ...line,
    countedBaseQuantity: line.enterpriseProductId === 'product-1' ? '9007199254740993.125' : '2.500',
    differenceBaseQuantity: line.enterpriseProductId === 'product-1' ? '9007199254740992.125' : '0.500'
  })),
  movements: [],
  replayed: false
};
