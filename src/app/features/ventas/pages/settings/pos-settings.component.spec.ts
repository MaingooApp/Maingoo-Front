import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { FoodPreparationService } from '@app/features/articles/services/food-preparation.service';
import { PosService } from '../../services/pos.service';
import { PosSettingsComponent } from './pos-settings.component';

describe('PosSettingsComponent', () => {
  it('loads configuration and exposes the selected catalog', () => {
    const timestamp = '2026-07-25T10:00:00.000Z';
    const posService = jasmine.createSpyObj<PosService>('PosService', [
      'getSettings',
      'listDevices',
      'listAreas',
      'listTables',
      'listMenuCategories',
      'listMenuItems',
      'listKitchenStations'
    ]);
    posService.getSettings.and.returnValue(
      of({
        id: 'settings-1',
        enterpriseId: 'enterprise-1',
        enabled: true,
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        pricesIncludeTax: true,
        allowNegativeStock: false,
        receiptFooter: null,
        fiscalMode: 'DISABLED',
        issuerLegalName: null,
        issuerTaxId: null,
        issuerAddress: null,
        fiscalSeriesPrefix: null,
        createdAt: timestamp,
        updatedAt: timestamp
      })
    );
    posService.listDevices.and.returnValue(of([]));
    posService.listAreas.and.returnValue(
      of([
        {
          id: 'area-1',
          enterpriseId: 'enterprise-1',
          name: 'Terraza',
          sortOrder: 0,
          active: true,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ])
    );
    posService.listTables.and.returnValue(of([]));
    posService.listMenuCategories.and.returnValue(of([]));
    posService.listMenuItems.and.returnValue(
      of([
        {
          id: 'item-1',
          enterpriseId: 'enterprise-1',
          categoryId: 'category-1',
          name: 'Café',
          sku: null,
          description: null,
          imageUrl: null,
          foodPreparationId: null,
          priceGross: '1.50',
          taxRate: '10.00',
          trackStock: false,
          kitchenStationId: null,
          sortOrder: 0,
          active: true,
          createdAt: timestamp,
          updatedAt: timestamp,
          modifierGroups: []
        }
      ])
    );
    posService.listKitchenStations.and.returnValue(of([]));
    const foodPreparationService = jasmine.createSpyObj<FoodPreparationService>('FoodPreparationService', ['getAll']);
    foodPreparationService.getAll.and.returnValue(throwError(() => new Error('missing permission')));

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: FoodPreparationService, useValue: foodPreparationService },
        provideNoopAnimations()
      ]
    });

    const component = TestBed.createComponent(PosSettingsComponent).componentInstance;
    component.selectSection('items');

    expect(component.loading()).toBeFalse();
    expect(component.items().map((item) => item.id)).toEqual(['item-1']);
  });
});
