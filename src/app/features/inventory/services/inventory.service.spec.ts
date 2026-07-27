import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';

import { ApplyInventoryMovementCommand } from '../models/inventory.models';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let http: HttpTestingController;
  const apiUrl = `${environment.urlBackend}api/inventory`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InventoryService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('encodes summary filters including false values', () => {
    service.getSummary({ search: 'café', lowStockOnly: false, includeInactive: true }).subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${apiUrl}/summary` &&
        candidate.params.get('search') === 'café' &&
        candidate.params.get('lowStockOnly') === 'false' &&
        candidate.params.get('includeInactive') === 'true'
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], totals: { products: 0, lowStock: 0, needsManualReview: 0 } });
  });

  it('sends manual movement idempotency inside the flat body', () => {
    const command: ApplyInventoryMovementCommand = {
      enterpriseProductId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
      type: 'WASTE',
      quantityBase: '-1.250',
      baseUnit: 'g',
      idempotencyKey: 'b153911f-2043-4ddd-a1c3-653b22b96d20',
      reasonCode: 'EXPIRED'
    };

    service.applyMovement(command).subscribe();

    const request = http.expectOne(`${apiUrl}/movements`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush({});
  });

  it('uses the count id in the completion URL and sends every line flat', () => {
    const command = {
      lines: [
        {
          enterpriseProductId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
          countedBaseQuantity: '3.125'
        }
      ]
    };

    service.completeCount('count-1', command).subscribe();

    const request = http.expectOne(`${apiUrl}/counts/count-1/complete`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    request.flush({});
  });
});
