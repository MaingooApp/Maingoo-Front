import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { FoodPreparationService } from '@app/features/articles/services/food-preparation.service';
import { DevicePairingService } from '@app/features/device/services/device-pairing.service';
import { ConfirmDialogService } from '@app/shared/services/confirm-dialog.service';
import { PosService } from '../../services/pos.service';
import { PosSettingsComponent } from './pos-settings.component';

describe('PosSettingsComponent', () => {
  let component: PosSettingsComponent;
  let pairingService: jasmine.SpyObj<DevicePairingService>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const timestamp = '2026-07-25T10:00:00.000Z';
    const posService = jasmine.createSpyObj<PosService>('PosService', [
      'getSettings',
      'listDevices',
      'listAreas',
      'listTables',
      'listMenuCategories',
      'listMenuItems',
      'listModifierGroups',
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
    posService.listModifierGroups.and.returnValue(of([]));
    posService.listKitchenStations.and.returnValue(of([]));
    const foodPreparationService = jasmine.createSpyObj<FoodPreparationService>('FoodPreparationService', ['getAll']);
    foodPreparationService.getAll.and.returnValue(throwError(() => new Error('missing permission')));
    pairingService = jasmine.createSpyObj<DevicePairingService>('DevicePairingService', ['lookup', 'approve', 'deny']);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: FoodPreparationService, useValue: foodPreparationService },
        { provide: DevicePairingService, useValue: pairingService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}), routeConfig: { path: 'configuracion' } } }
        },
        { provide: Router, useValue: router },
        provideNoopAnimations()
      ]
    });

    component = TestBed.createComponent(PosSettingsComponent).componentInstance;
  });

  it('loads configuration and validates modifier selection ranges', () => {
    component.selectSection('items');

    expect(component.loading()).toBeFalse();
    expect(component.items().map((item) => item.id)).toEqual(['item-1']);

    component.selectSection('modifiers');
    component.entityForm.required = true;
    component.entityForm.minSelections = 0;
    expect(component.modifierSelectionRangeInvalid()).toBeTrue();

    component.entityForm.required = false;
    component.entityForm.maxSelections = 2;
    expect(component.modifierSelectionRangeInvalid()).toBeTrue();
  });

  it('updates the highlighted settings tab when the section changes', () => {
    const fixture = TestBed.createComponent(PosSettingsComponent);
    fixture.detectChanges();
    fixture.componentInstance.selectSection('stations');
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('nav button');
    expect(buttons[0].classList).toContain('p-button-outlined');
    expect(buttons[7].classList).not.toContain('p-button-outlined');
  });

  it('normalizes a QR code and approves a KDS for all stations after confirmation', async () => {
    pairingService.lookup.and.returnValue(
      of({
        id: 'pairing-1',
        requestedType: 'KDS',
        requestedLabel: 'Pantalla pase',
        appVersion: null,
        status: 'PENDING',
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-07-29T10:00:00.000Z'
      })
    );
    pairingService.approve.and.returnValue(of({}));
    confirmDialog.confirm.and.resolveTo(true);

    component.openPairing('abcd efgh');
    expect(pairingService.lookup).toHaveBeenCalledOnceWith('ABCD-EFGH');
    expect(component.pairingName).toBe('Pantalla pase');

    component.pairingKitchenStationId = '';
    await component.approvePairing();

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(pairingService.approve).toHaveBeenCalledOnceWith('pairing-1', {
      userCode: 'ABCD-EFGH',
      name: 'Pantalla pase',
      kitchenStationId: null
    });
  });

  it('requires confirmation before rejecting and never includes a device credential', async () => {
    pairingService.lookup.and.returnValue(
      of({
        id: 'pairing-2',
        requestedType: 'REGISTER',
        requestedLabel: null,
        appVersion: null,
        status: 'PENDING',
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-07-29T10:00:00.000Z'
      })
    );
    pairingService.deny.and.returnValue(of({ id: 'pairing-2', status: 'DENIED' }));
    confirmDialog.confirm.and.resolveTo(true);

    component.openPairing('ABCD-EFGH');
    await component.denyPairing();

    expect(pairingService.deny).toHaveBeenCalledOnceWith('pairing-2', { userCode: 'ABCD-EFGH' });
  });

  it('continues to employee PIN setup after approving a waiter terminal', async () => {
    pairingService.lookup.and.returnValue(
      of({
        id: 'pairing-3',
        requestedType: 'REGISTER',
        requestedLabel: 'Tablet terraza',
        appVersion: null,
        status: 'PENDING',
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-07-29T10:00:00.000Z'
      })
    );
    pairingService.approve.and.returnValue(of({}));
    confirmDialog.confirm.and.resolveTo(true);

    component.openPairing('ABCD-EFGH');
    await component.approvePairing();

    expect(router.navigate).toHaveBeenCalledWith(['/usuarios'], { queryParams: { setupPosPin: '1' } });
  });
});
