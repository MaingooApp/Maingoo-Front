import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { KitchenTicketListItem, KitchenTicketUpdateResponse } from '../../models/pos.models';
import { PosService } from '../../services/pos.service';
import { KitchenDisplayComponent } from './kitchen-display.component';

describe('KitchenDisplayComponent', () => {
  let component: KitchenDisplayComponent;
  let posService: jasmine.SpyObj<PosService>;

  beforeEach(() => {
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'listDevices',
      'listKitchenTickets',
      'updateKitchenTicket'
    ]);
    TestBed.configureTestingModule({ providers: [{ provide: PosService, useValue: posService }] });
    component = TestBed.runInInjectionContext(() => new KitchenDisplayComponent());
  });

  it('merges incremental pages by id/version without duplicates and removes inactive tickets', () => {
    component.mergeTickets([ticket({ id: 'ticket-1', version: 2, updatedAt: '2026-07-27T10:02:00.000Z' })]);
    component.mergeTickets([
      ticket({ id: 'ticket-1', version: 1, updatedAt: '2026-07-27T10:03:00.000Z', status: 'READY' }),
      ticket({ id: 'ticket-2', version: 1, updatedAt: '2026-07-27T10:03:00.000Z' })
    ]);

    expect(component.tickets().map(({ id }) => id)).toEqual(['ticket-1', 'ticket-2']);
    expect(component.tickets()[0].status).toBe('QUEUED');

    component.mergeTickets([
      ticket({ id: 'ticket-1', version: 3, updatedAt: '2026-07-27T10:04:00.000Z', status: 'SERVED' })
    ]);

    expect(component.tickets().map(({ id }) => id)).toEqual(['ticket-2']);
  });

  it('sends only the next backend-supported transition and merges its response', () => {
    const queued = ticket({ id: 'ticket-1', status: 'QUEUED' });
    const updated: KitchenTicketUpdateResponse = {
      ...queued,
      status: 'IN_PROGRESS',
      startedAt: '2026-07-27T10:01:00.000Z',
      updatedAt: '2026-07-27T10:01:00.000Z',
      order: queued.order
    };
    posService.updateKitchenTicket.and.returnValue(of(updated));
    component.selectedDeviceId.set('device-1');
    component.online.set(true);
    component.mergeTickets([queued]);

    component.transition(queued);

    expect(posService.updateKitchenTicket).toHaveBeenCalledWith(
      jasmine.objectContaining({ ticketId: 'ticket-1', deviceId: 'device-1', status: 'IN_PROGRESS' }),
      jasmine.stringMatching(/^[0-9a-f-]{36}$/i)
    );
    expect(component.tickets()[0].status).toBe('IN_PROGRESS');
    expect(component.nextStatus('SERVED')).toBeNull();
  });
});

function ticket(
  overrides: Partial<KitchenTicketListItem> & { version?: number } = {}
): KitchenTicketListItem & { version?: number } {
  return {
    id: 'ticket-1',
    enterpriseId: 'enterprise-1',
    orderId: 'order-1',
    stationId: 'station-1',
    sequence: 1,
    status: 'QUEUED',
    sentAt: '2026-07-27T10:00:00.000Z',
    startedAt: null,
    readyAt: null,
    servedAt: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    station: {
      id: 'station-1',
      enterpriseId: 'enterprise-1',
      name: 'Hot kitchen',
      sortOrder: 1,
      active: true,
      createdAt: '2026-07-27T09:00:00.000Z',
      updatedAt: '2026-07-27T09:00:00.000Z'
    },
    order: {
      id: 'order-1',
      orderNumber: 42,
      tableId: 'table-1',
      channel: 'DINE_IN',
      table: { id: 'table-1', name: 'Terraza 1' }
    },
    items: [
      {
        id: 'item-1',
        enterpriseId: 'enterprise-1',
        kitchenTicketId: 'ticket-1',
        orderLineId: 'line-1',
        itemName: 'Burger',
        quantity: '2.000',
        note: 'No onion',
        createdAt: '2026-07-27T10:00:00.000Z',
        updatedAt: '2026-07-27T10:00:00.000Z',
        modifiers: [{ id: 'modifier-1', name: 'Sin salsa', quantity: '1.000' }]
      }
    ],
    ...overrides
  };
}
