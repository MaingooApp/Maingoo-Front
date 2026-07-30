import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { POS_AUTH_MODE } from '../../device/interceptors/pos-auth.context';

import { CreateOrderCommandData, UpdateKitchenTicketCommandData } from '../models/pos-command.models';
import { CreateModifierGroupDto, UpdatePosSettingsDto } from '../models/pos-configuration.models';
import { PosService } from './pos.service';

describe('PosService', () => {
  let service: PosService;
  let http: HttpTestingController;
  const apiUrl = `${environment.urlBackend}api/pos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PosService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends a flat command body and the caller idempotency key', () => {
    const command: CreateOrderCommandData = {
      deviceId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
      clientCreatedAt: '2026-07-25T10:00:00.000Z',
      channel: 'TAKEAWAY'
    };
    const key = 'b153911f-2043-4ddd-a1c3-653b22b96d20';

    service.createOrder(command, key).subscribe();

    const request = http.expectOne(`${apiUrl}/orders`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.headers.get('Idempotency-Key')).toBe(key);
    request.flush({});
  });

  it('sends terminal bootstrap and orders with employee authentication', () => {
    service.getBootstrap('device-1', undefined, 'enterprise-1', 'DEVICE_EMPLOYEE').subscribe();
    const bootstrap = http.expectOne(
      (candidate) => candidate.url === `${apiUrl}/bootstrap` && candidate.params.get('deviceId') === 'device-1'
    );
    expect(bootstrap.request.context.get(POS_AUTH_MODE)).toBe('DEVICE_EMPLOYEE');
    bootstrap.flush({});

    service
      .createOrder(
        {
          deviceId: 'device-1',
          clientCreatedAt: '2026-07-25T10:00:00.000Z',
          channel: 'TAKEAWAY'
        },
        'employee-command',
        'DEVICE_EMPLOYEE'
      )
      .subscribe();
    const order = http.expectOne(`${apiUrl}/orders`);
    expect(order.request.context.get(POS_AUTH_MODE)).toBe('DEVICE_EMPLOYEE');
    order.flush({});
  });

  it('removes an open line with the versioned command and caller idempotency key', () => {
    const command = {
      deviceId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
      clientCreatedAt: '2026-07-25T10:00:00.000Z',
      expectedVersion: 3
    };
    const key = 'b153911f-2043-4ddd-a1c3-653b22b96d20';

    service.removeLine('order-id', 'line-id', command, key).subscribe();

    const request = http.expectOne(`${apiUrl}/orders/order-id/lines/line-id/remove`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.headers.get('Idempotency-Key')).toBe(key);
    request.flush({});
  });

  it('uses the collection kitchen endpoint and keeps ticketId in the body', () => {
    const command: UpdateKitchenTicketCommandData = {
      deviceId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
      clientCreatedAt: '2026-07-25T10:00:00.000Z',
      ticketId: 'c3fe1a86-cf64-4b65-abcd-a6dd5b58702c',
      status: 'READY'
    };

    service.updateKitchenTicket(command, '5d5a5b24-e06d-4a47-adf8-b3c3025d2d09').subscribe();

    const request = http.expectOne(`${apiUrl}/kitchen/tickets`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(command);
    expect(request.request.context.get(POS_AUTH_MODE)).toBe('HUMAN');
    request.flush({});
  });

  it('sends kitchen reads and updates with explicit device authentication', () => {
    service.listKitchenStations({ active: true, enterpriseId: 'enterprise-1' }, 'DEVICE').subscribe();

    const stations = http.expectOne(
      (candidate) =>
        candidate.url === `${apiUrl}/kitchen/stations` &&
        candidate.params.get('active') === 'true' &&
        candidate.params.get('enterpriseId') === 'enterprise-1'
    );
    expect(stations.request.context.get(POS_AUTH_MODE)).toBe('DEVICE');
    stations.flush([]);

    service.listKitchenTickets({ stationId: 'station-1' }, 'DEVICE').subscribe();

    const list = http.expectOne(
      (candidate) => candidate.url === `${apiUrl}/kitchen/tickets` && candidate.params.get('stationId') === 'station-1'
    );
    expect(list.request.context.get(POS_AUTH_MODE)).toBe('DEVICE');
    list.flush({ items: [] });

    const command: UpdateKitchenTicketCommandData = {
      deviceId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4',
      clientCreatedAt: '2026-07-25T10:00:00.000Z',
      ticketId: 'c3fe1a86-cf64-4b65-abcd-a6dd5b58702c',
      status: 'READY'
    };
    service.updateKitchenTicket(command, '5d5a5b24-e06d-4a47-adf8-b3c3025d2d09', 'DEVICE').subscribe();

    const update = http.expectOne(`${apiUrl}/kitchen/tickets`);
    expect(update.request.context.get(POS_AUTH_MODE)).toBe('DEVICE');
    expect(update.request.headers.get('Idempotency-Key')).toBe('5d5a5b24-e06d-4a47-adf8-b3c3025d2d09');
    update.flush({});
  });

  it('encodes sync filters without sending absent values', () => {
    service.getSync('7b9c70e2-c246-4e30-a1ac-2e4305044cd4').subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${apiUrl}/sync` &&
        candidate.params.get('deviceId') === '7b9c70e2-c246-4e30-a1ac-2e4305044cd4' &&
        !candidate.params.has('cursor')
    );
    expect(request.request.method).toBe('GET');
    request.flush({ changes: [], serverCursor: 'cursor' });
  });

  it('updates settings with a flat body and without idempotency', () => {
    const dto: UpdatePosSettingsDto = {
      enabled: true,
      currency: 'EUR',
      timezone: 'Europe/Madrid'
    };

    service.updateSettings(dto).subscribe();

    const request = http.expectOne(`${apiUrl}/settings`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(dto);
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush({});
  });

  it('encodes menu item filters including false', () => {
    service.listMenuItems({ categoryId: 'category-id', active: false, search: 'café' }).subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${apiUrl}/menu/items` &&
        candidate.params.get('categoryId') === 'category-id' &&
        candidate.params.get('active') === 'false' &&
        candidate.params.get('search') === 'café'
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a modifier group with its nested options and without idempotency', () => {
    const dto: CreateModifierGroupDto = {
      name: 'Tamaño',
      maxSelections: 1,
      required: true,
      options: [{ name: 'Grande', priceDeltaGross: '1.50' }]
    };

    service.createModifierGroup(dto).subscribe();

    const request = http.expectOne(`${apiUrl}/menu/modifier-groups`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(dto);
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush({});
  });

  it('sends null when unlinking a menu item recipe', () => {
    service.updateMenuItem('item-id', { foodPreparationId: null, trackStock: false }).subscribe();

    const request = http.expectOne(`${apiUrl}/menu/items/item-id`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ foodPreparationId: null, trackStock: false });
    request.flush({});
  });

  it('uses each dedicated sales report endpoint with the same typed filters', () => {
    const filters = { date: '2026-07-27', deviceId: '7b9c70e2-c246-4e30-a1ac-2e4305044cd4' };
    const reports: Array<readonly [string, () => void]> = [
      ['daily-sales', () => service.getDailySales(filters).subscribe()],
      ['sales-by-item', () => service.getSalesByItem(filters).subscribe()],
      ['sales-by-category', () => service.getSalesByCategory(filters).subscribe()],
      ['sales-by-hour', () => service.getSalesByHour(filters).subscribe()],
      ['sales-by-payment-method', () => service.getSalesByPaymentMethod(filters).subscribe()],
      ['cash-deviation', () => service.getCashDeviation(filters).subscribe()],
      ['incomplete-costs', () => service.getIncompleteCosts(filters).subscribe()]
    ];

    for (const [path, requestReport] of reports) {
      requestReport();
      const request = http.expectOne(
        (candidate) =>
          candidate.url === `${apiUrl}/reports/${path}` &&
          candidate.params.get('date') === filters.date &&
          candidate.params.get('deviceId') === filters.deviceId
      );
      expect(request.request.method).toBe('GET');
      request.flush({});
    }
  });
});
