import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';

import { CreateOrderCommandData, UpdateKitchenTicketCommandData } from '../models/pos-command.models';
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
    request.flush({});
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
});
