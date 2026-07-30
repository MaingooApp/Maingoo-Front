import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DeviceContext, PairedDeviceIdentity } from '../../../device/models/device-session.models';
import { DevicePairingService } from '../../../device/services/device-pairing.service';
import { DeviceSessionService } from '../../../device/services/device-session.service';
import { KitchenTicketListItem, KitchenTicketUpdateResponse, PosDevice } from '../../models/pos.models';
import { PosService } from '../../services/pos.service';
import { KitchenDisplayComponent } from './kitchen-display.component';

describe('KitchenDisplayComponent', () => {
  let routeData: Record<string, unknown>;
  let posService: jasmine.SpyObj<PosService>;
  let pairingService: jasmine.SpyObj<DevicePairingService>;
  let deviceSession: jasmine.SpyObj<DeviceSessionService>;
  let deviceState: WritableSignal<PairedDeviceIdentity['device'] | null>;

  beforeEach(() => {
    localStorage.removeItem('maingoo-pos-kds-device-id');
    routeData = {};
    deviceState = signal<PairedDeviceIdentity['device'] | null>(null);
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'listDevices',
      'listKitchenStations',
      'listKitchenTickets',
      'updateKitchenTicket'
    ]);
    posService.listDevices.and.returnValue(of([]));
    posService.listKitchenStations.and.returnValue(of([ticket().station]));
    posService.listKitchenTickets.and.returnValue(of(emptyPage()));
    pairingService = jasmine.createSpyObj<DevicePairingService>('DevicePairingService', ['getContext']);
    deviceSession = jasmine.createSpyObj<DeviceSessionService>('DeviceSessionService', ['applyDeviceContext'], {
      device: deviceState.asReadonly()
    });
    deviceSession.applyDeviceContext.and.callFake(async (context) => {
      deviceState.set(context.device);
    });
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [KitchenDisplayComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PosService, useValue: posService },
        { provide: DevicePairingService, useValue: pairingService },
        { provide: DeviceSessionService, useValue: deviceSession },
        { provide: ActivatedRoute, useValue: { snapshot: { data: routeData } } },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('merges incremental pages by id/version without duplicates and removes inactive tickets', () => {
    const component = createComponent().componentInstance;
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

  it('keeps the human KDS selector and uses HUMAN for transitions', () => {
    const device = humanDevice();
    posService.listDevices.and.returnValue(of([device]));
    const fixture = createComponent();
    fixture.detectChanges();
    fixture.detectChanges();

    expect(posService.listDevices).toHaveBeenCalledOnceWith({ type: 'KDS', status: 'ACTIVE' });
    expect(pairingService.getContext).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#kds-device')).not.toBeNull();

    const component = fixture.componentInstance;
    const queued = ticket({ id: 'ticket-1', status: 'QUEUED' });
    posService.updateKitchenTicket.and.returnValue(of(updatedTicket(queued)));
    component.selectedDeviceId.set(device.id);
    component.online.set(true);
    component.mergeTickets([queued]);
    component.transition(queued);

    expect(posService.updateKitchenTicket).toHaveBeenCalledWith(
      jasmine.objectContaining({ ticketId: 'ticket-1', deviceId: device.id, status: 'IN_PROGRESS' }),
      jasmine.stringMatching(/^[0-9a-f-]{36}$/i),
      'HUMAN'
    );
  });

  it('validates context before polling and fixes device identity and station in DEVICE mode', fakeAsync(() => {
    routeData['deviceMode'] = 'KDS';
    const context = deviceContext('station-1');
    const callOrder: string[] = [];
    pairingService.getContext.and.callFake(() => {
      callOrder.push('context');
      return of(context);
    });
    posService.listKitchenTickets.and.callFake(() => {
      callOrder.push('poll');
      return of(emptyPage());
    });
    const fixture = createComponent();

    fixture.detectChanges();
    flushMicrotasks();
    tick(0);
    fixture.detectChanges();

    expect(pairingService.getContext).toHaveBeenCalledTimes(1);
    expect(deviceSession.applyDeviceContext).toHaveBeenCalledOnceWith(context);
    expect(posService.listDevices).not.toHaveBeenCalled();
    expect(posService.listKitchenStations).toHaveBeenCalledOnceWith(
      { active: true, enterpriseId: 'enterprise-1' },
      'DEVICE'
    );
    expect(callOrder[0]).toBe('context');
    expect(callOrder.indexOf('poll')).toBeGreaterThan(0);
    expect(posService.listKitchenTickets).toHaveBeenCalledWith(
      jasmine.objectContaining({ enterpriseId: 'enterprise-1', stationId: 'station-1' }),
      'DEVICE'
    );
    expect(fixture.nativeElement.querySelector('#kds-device')).toBeNull();
    expect(fixture.nativeElement.querySelector('#kds-station')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="kds-device-name"]').textContent).toContain(
      'Pantalla cocina'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="kds-fixed-station"]')).not.toBeNull();

    const queued = ticket({ id: 'ticket-device', stationId: 'station-1' });
    posService.updateKitchenTicket.and.returnValue(of(updatedTicket(queued)));
    fixture.componentInstance.mergeTickets([queued]);
    fixture.componentInstance.transition(queued);
    expect(posService.updateKitchenTicket).toHaveBeenCalledWith(
      jasmine.objectContaining({ ticketId: 'ticket-device', deviceId: 'device-1' }),
      jasmine.stringMatching(/^[0-9a-f-]{36}$/i),
      'DEVICE'
    );

    fixture.destroy();
  }));

  it('allows the visual station filter when a paired KDS has no fixed station', fakeAsync(() => {
    routeData['deviceMode'] = 'KDS';
    pairingService.getContext.and.returnValue(of(deviceContext(null)));
    const fixture = createComponent();

    fixture.detectChanges();
    flushMicrotasks();
    tick(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#kds-device')).toBeNull();
    expect(fixture.nativeElement.querySelector('#kds-station')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('#kds-station option').length).toBe(2);
    expect(posService.listKitchenTickets).toHaveBeenCalledWith(
      jasmine.objectContaining({ enterpriseId: 'enterprise-1' }),
      'DEVICE'
    );
    const filters = posService.listKitchenTickets.calls.first().args[0];
    expect(filters?.stationId).toBeUndefined();

    fixture.destroy();
  }));
});

function createComponent(): ComponentFixture<KitchenDisplayComponent> {
  return TestBed.createComponent(KitchenDisplayComponent);
}

function emptyPage() {
  return { items: [], page: 1, limit: 100, nextPage: null };
}

function humanDevice(): PosDevice {
  return {
    id: 'device-human',
    enterpriseId: 'enterprise-1',
    name: 'KDS manual',
    code: 'kds-manual',
    type: 'KDS',
    status: 'ACTIVE',
    lastSeenAt: null,
    appVersion: null,
    createdByUserId: 'user-1',
    createdAt: '2026-07-27T09:00:00.000Z',
    updatedAt: '2026-07-27T09:00:00.000Z'
  };
}

function deviceContext(kitchenStationId: string | null): DeviceContext {
  return {
    deviceId: 'device-1',
    enterpriseId: 'enterprise-1',
    deviceType: 'KDS',
    kitchenStationId,
    credentialExpiresAt: '2099-01-01T00:00:00.000Z',
    credentialExpiresSoon: false,
    mode: 'KDS',
    device: {
      id: 'device-1',
      enterpriseId: 'enterprise-1',
      name: 'Pantalla cocina',
      code: 'kds-device',
      type: 'KDS',
      status: 'ACTIVE',
      kitchenStationId,
      pairedAt: '2026-07-27T09:00:00.000Z',
      lastSeenAt: '2026-07-27T10:00:00.000Z',
      appVersion: null
    }
  };
}

function updatedTicket(queued: KitchenTicketListItem): KitchenTicketUpdateResponse {
  return {
    ...queued,
    status: 'IN_PROGRESS',
    startedAt: '2026-07-27T10:01:00.000Z',
    updatedAt: '2026-07-27T10:01:00.000Z',
    order: queued.order
  };
}

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
