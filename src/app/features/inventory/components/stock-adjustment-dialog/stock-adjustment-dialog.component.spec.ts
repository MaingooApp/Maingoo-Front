import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { of } from 'rxjs';

import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';

import { InventorySummaryItem, StockMovement } from '../../models/inventory.models';
import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';
import { InventoryService } from '../../services/inventory.service';
import { StockAdjustmentDialogComponent } from './stock-adjustment-dialog.component';

describe('StockAdjustmentDialogComponent', () => {
  it('converts waste to a negative exact delta and includes idempotency in the body', async () => {
    const inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['applyMovement']);
    const confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    inventoryService.applyMovement.and.returnValue(of(movement));
    confirmDialog.confirm.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [StockAdjustmentDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: InventoryConnectivityService, useValue: { online: () => true } },
        { provide: NgxPermissionsService, useValue: { getPermission: () => ({}) } },
        provideNoopAnimations()
      ]
    });

    const fixture = TestBed.createComponent(StockAdjustmentDialogComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.quantity = '0.200';
    component.reasonCode = 'SPILLAGE';

    expect(component.previewBalance()).toBe('9.9');
    await component.submit();

    const command = inventoryService.applyMovement.calls.mostRecent().args[0];
    expect(command.quantityBase).toBe('-0.2');
    expect(command.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(command.reasonCode).toBe('SPILLAGE');
  });
});

const product: InventorySummaryItem = {
  enterpriseProductId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
  productBaseId: '93e91156-8d19-4e20-912a-b99fe47a8299',
  name: 'Café',
  stockBaseQuantity: '10.100',
  stockBaseUnit: 'g',
  minimumStockBase: '2',
  stockUpdatedAt: '2026-07-27T08:00:00.000Z',
  isLowStock: false,
  needsManualReview: false,
  stockValue: '4.10'
};

const movement: StockMovement = {
  id: 'movement-1',
  enterpriseId: 'enterprise-1',
  enterpriseProductId: product.enterpriseProductId,
  type: 'WASTE',
  quantityBase: '-0.2',
  balanceAfterBase: '9.9',
  baseUnit: 'g',
  unitCost: null,
  totalCost: null,
  sourceType: 'manual',
  sourceId: 'source-1',
  idempotencyKey: 'b153911f-2043-4ddd-a1c3-653b22b96d20',
  reasonCode: 'SPILLAGE',
  note: null,
  createdByUserId: 'user-1',
  createdAt: '2026-07-27T08:00:00.000Z'
};
