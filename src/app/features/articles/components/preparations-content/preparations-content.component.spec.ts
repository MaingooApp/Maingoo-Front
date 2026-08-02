import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ToastService } from '@shared/services/toast.service';
import { FoodPreparationService } from '../../services/food-preparation.service';
import { FoodPreparationTypeService } from '../../services/food-preparation-type.service';
import { MachineryService } from '../../services/machinery.service';
import { UtensilService } from '../../services/utensil.service';
import { PreparationsContentComponent } from './preparations-content.component';

describe('PreparationsContentComponent', () => {
  let foodPreparationService: jasmine.SpyObj<FoodPreparationService>;

  beforeEach(() => {
    foodPreparationService = jasmine.createSpyObj<FoodPreparationService>('FoodPreparationService', [
      'getAll',
      'getOne',
      'create',
      'update',
      'remove'
    ]);
    foodPreparationService.getAll.and.returnValue(of([]));
    foodPreparationService.getOne.and.returnValue(
      of({
        id: 'preparation-1',
        enterpriseId: 'enterprise-1',
        typeId: 'type-article',
        name: 'Patatas bravas'
      })
    );
    foodPreparationService.create.and.returnValue(
      of({
        id: 'preparation-1',
        enterpriseId: 'enterprise-1',
        typeId: 'type-article',
        name: 'Patatas bravas'
      })
    );

    const typeService = jasmine.createSpyObj<FoodPreparationTypeService>('FoodPreparationTypeService', ['getTypes']);
    typeService.getTypes.and.returnValue(
      of([
        { id: 'type-elaboration', type: 'elaboration' },
        { id: 'type-article', type: 'article' }
      ])
    );
    const utensilService = jasmine.createSpyObj<UtensilService>('UtensilService', ['getUtensils']);
    utensilService.getUtensils.and.returnValue(of([]));
    const machineryService = jasmine.createSpyObj<MachineryService>('MachineryService', ['getMachinery']);
    machineryService.getMachinery.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [PreparationsContentComponent],
      providers: [
        { provide: FoodPreparationService, useValue: foodPreparationService },
        { provide: FoodPreparationTypeService, useValue: typeService },
        { provide: UtensilService, useValue: utensilService },
        { provide: MachineryService, useValue: machineryService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) },
        provideNoopAnimations()
      ]
    });
  });

  it('sends the article type and yield when creating an article', () => {
    const component = createComponent('article');

    component.newPreparationName.set('Patatas bravas');
    component.yieldQuantity.set(1);
    component.yieldMeasure.set('ud');
    component.portionCount.set(1);
    component.onSave();

    expect(foodPreparationService.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        typeId: 'type-article',
        name: 'Patatas bravas',
        yieldQuantity: 1,
        yieldMeasure: 'ud',
        portionCount: 1
      })
    );
  });

  it('sends the elaboration type and yield when creating an elaboration', () => {
    const component = createComponent('elaboration');

    component.newPreparationName.set('Salsa brava');
    component.yieldQuantity.set(1000);
    component.yieldMeasure.set('g');
    component.onSave();

    expect(foodPreparationService.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        typeId: 'type-elaboration',
        name: 'Salsa brava',
        yieldQuantity: 1000,
        yieldMeasure: 'g'
      })
    );
  });

  it('uses the elaboration yield unit for sub-preparation quantities', () => {
    const component = createComponent('article');

    component.updateIngredientRow(0, { type: 'elaboration' });
    component.onSelectedItemChange(0, {
      id: 'liquid-elaboration',
      name: 'Caldo',
      yieldMeasure: 'ml'
    });

    expect(component.ingredientRows()[0].unit).toBe('ml');
    expect(component.getMeasureOptions(component.ingredientRows()[0]).map(({ value }) => value)).toEqual(['ml', 'l']);
  });

  function createComponent(type: 'article' | 'elaboration'): PreparationsContentComponent {
    const fixture: ComponentFixture<PreparationsContentComponent> =
      TestBed.createComponent(PreparationsContentComponent);
    fixture.componentRef.setInput('type', type);
    fixture.detectChanges();
    fixture.componentInstance.startCreate();
    return fixture.componentInstance;
  }
});
