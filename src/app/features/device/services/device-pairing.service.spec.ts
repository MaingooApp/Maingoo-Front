import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { POS_AUTH_MODE } from '../interceptors/pos-auth.context';
import { DevicePairingService } from './device-pairing.service';

describe('DevicePairingService', () => {
  let service: DevicePairingService;
  let http: HttpTestingController;
  const apiUrl = `${environment.urlBackend}api/pos/device-pairings`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DevicePairingService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DevicePairingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates and exchanges a pairing with explicit public authentication', () => {
    service.create({ requestedType: 'KDS', requestedLabel: 'Cocina' }).subscribe();

    const creation = http.expectOne(apiUrl);
    expect(creation.request.method).toBe('POST');
    expect(creation.request.context.get(POS_AUTH_MODE)).toBe('PUBLIC');
    expect(creation.request.body).toEqual({ requestedType: 'KDS', requestedLabel: 'Cocina' });
    creation.flush({});

    service.exchange('opaque-device-code').subscribe();
    const exchange = http.expectOne(`${apiUrl}/token`);
    expect(exchange.request.context.get(POS_AUTH_MODE)).toBe('PUBLIC');
    expect(exchange.request.body).toEqual({ deviceCode: 'opaque-device-code' });
    exchange.flush({ code: 'PAIRING_PENDING' });
  });

  it('looks up the visible code with explicit human authentication', () => {
    service.lookup('ABCD-EFGH').subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${apiUrl}/lookup` && candidate.params.get('userCode') === 'ABCD-EFGH'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(POS_AUTH_MODE)).toBe('HUMAN');
    request.flush({});
  });

  it('approves and denies by pairing id without sending a device credential', () => {
    service.approve('pairing-1', { userCode: 'ABCD-EFGH', name: 'Cocina', kitchenStationId: null }).subscribe();
    const approval = http.expectOne(`${apiUrl}/pairing-1/approve`);
    expect(approval.request.context.get(POS_AUTH_MODE)).toBe('HUMAN');
    expect(approval.request.body).toEqual({
      userCode: 'ABCD-EFGH',
      name: 'Cocina',
      kitchenStationId: null
    });
    expect(approval.request.body).not.toEqual(jasmine.objectContaining({ deviceCode: jasmine.anything() }));
    approval.flush({});

    service.deny('pairing-1', { userCode: 'ABCD-EFGH' }).subscribe();
    const denial = http.expectOne(`${apiUrl}/pairing-1/deny`);
    expect(denial.request.context.get(POS_AUTH_MODE)).toBe('HUMAN');
    expect(denial.request.body).toEqual({ userCode: 'ABCD-EFGH' });
    denial.flush({ id: 'pairing-1', status: 'DENIED' });
  });
});
