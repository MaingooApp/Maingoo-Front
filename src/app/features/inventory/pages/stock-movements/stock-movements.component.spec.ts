import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { InventoryConnectivityService } from '../../services/inventory-connectivity.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementsComponent } from './stock-movements.component';

describe('StockMovementsComponent', () => {
  it('sends the selected local days as complete ISO boundaries', () => {
    const inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', [
      'listMovements',
      'getSummary'
    ]);
    inventoryService.listMovements.and.returnValue(of({ items: [], total: 0, page: 1, limit: 50 }));
    inventoryService.getSummary.and.returnValue(
      of({ items: [], totals: { products: 0, lowStock: 0, needsManualReview: 0 } })
    );

    TestBed.configureTestingModule({
      imports: [StockMovementsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: InventoryConnectivityService, useValue: { online: () => true } }
      ]
    });

    const fixture = TestBed.createComponent(StockMovementsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.from = '2026-07-27';
    component.to = '2026-07-27';
    component.applyFilters();

    expect(inventoryService.listMovements).toHaveBeenCalled();
    const filters = inventoryService.listMovements.calls.mostRecent().args[0]!;
    expect(filters.from).toBe(new Date(2026, 6, 27, 0, 0, 0, 0).toISOString());
    expect(filters.to).toBe(new Date(2026, 6, 27, 23, 59, 59, 999).toISOString());
  });
});
