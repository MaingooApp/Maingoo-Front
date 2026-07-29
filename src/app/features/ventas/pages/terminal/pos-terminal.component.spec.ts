import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NgxPermissionsService } from 'ngx-permissions';
import { of } from 'rxjs';

import { AuthService } from '@features/auth/services/auth-service.service';
import { DeviceSessionService } from '../../../device/services/device-session.service';
import { MenuItem, MenuItemModifierGroup } from '../../models/pos.models';
import { PosSessionStore } from '../../services/pos-session.store';
import { PosService } from '../../services/pos.service';
import { PosTerminalComponent } from './pos-terminal.component';

describe('PosTerminalComponent', () => {
  it('hydrates the tenant cache before requesting devices and protects a pending queue', async () => {
    const calls: string[] = [];
    const pendingCommandCount = signal(1);
    const store = {
      device: signal(null),
      errorCode: signal<string | null>(null),
      pendingCommandCount,
      initialize: async () => {
        calls.push('initialize');
      },
      connectivityChanged: () => undefined
    };
    const posService = {
      listDevices: () => {
        calls.push('listDevices');
        return of([]);
      }
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PosSessionStore, useValue: store },
        { provide: PosService, useValue: posService },
        { provide: AuthService, useValue: { getEnterpriseId: () => 'enterprise-1' } },
        { provide: NgxPermissionsService, useValue: { getPermission: () => undefined } }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new PosTerminalComponent());

    await component.ngOnInit();
    component.selectedDeviceId.set('device-1');
    component.changeDevice();

    expect(calls).toEqual(['initialize', 'listDevices']);
    expect(component.selectedDeviceId()).toBe('device-1');
    expect(component.selectingDevice()).toBeFalse();
  });

  it('invalidates a cached register that is no longer active', async () => {
    const invalidateCachedDevice = jasmine.createSpy().and.resolveTo();
    const store = {
      device: signal({ id: 'revoked-device' }),
      errorCode: signal<string | null>(null),
      pendingCommandCount: signal(0),
      initialize: async () => undefined,
      connectivityChanged: () => undefined,
      invalidateCachedDevice
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PosSessionStore, useValue: store },
        { provide: PosService, useValue: { listDevices: () => of([]) } },
        { provide: AuthService, useValue: { getEnterpriseId: () => 'enterprise-1' } },
        { provide: NgxPermissionsService, useValue: { getPermission: () => undefined } }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new PosTerminalComponent());

    await component.ngOnInit();

    expect(invalidateCachedDevice).toHaveBeenCalledTimes(1);
    expect(component.selectedDeviceId()).toBe('');
    expect(component.selectingDevice()).toBeTrue();
  });

  it('activates only the paired register with employee authentication', async () => {
    const initialize = jasmine.createSpy().and.resolveTo();
    const activateDevice = jasmine.createSpy().and.resolveTo();
    const reset = jasmine.createSpy();
    const store = {
      device: signal(null),
      errorCode: signal<string | null>(null),
      initialize,
      activateDevice,
      reset,
      connectivityChanged: () => undefined
    };
    const pairedDevice = {
      id: 'device-1',
      enterpriseId: 'enterprise-1',
      name: 'Terminal barra',
      type: 'REGISTER' as const,
      kitchenStationId: null,
      status: 'ACTIVE' as const
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PosSessionStore, useValue: store },
        { provide: PosService, useValue: { listDevices: jasmine.createSpy() } },
        { provide: AuthService, useValue: { getEnterpriseId: () => null } },
        { provide: NgxPermissionsService, useValue: { getPermission: () => undefined } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { deviceMode: 'REGISTER' } } } },
        {
          provide: DeviceSessionService,
          useValue: {
            initialize: jasmine.createSpy().and.resolveTo(),
            device: signal(pairedDevice),
            operatorSession: signal({
              user: { id: 'user-1', name: 'Camarero' },
              permissions: ['pos.sell'],
              operatorToken: 'token',
              expiresAt: '2099-01-01T00:00:00.000Z'
            })
          }
        }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new PosTerminalComponent());

    await component.ngOnInit();

    expect(initialize).toHaveBeenCalledOnceWith('enterprise-1', 'DEVICE_EMPLOYEE');
    expect(activateDevice).toHaveBeenCalledOnceWith('device-1');
    expect(component.pairedTerminal).toBeTrue();
    expect(component.canOpenCash).toBeFalse();

    component.ngOnDestroy();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('enforces modifier and guest-count constraints', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PosSessionStore,
          useValue: {
            areas: signal([]),
            tables: signal([]),
            activeOrders: signal([]),
            menuCategories: signal([]),
            menuItems: signal([]),
            selectedOrder: signal(null),
            operationPending: signal(false)
          }
        },
        { provide: PosService, useValue: {} },
        { provide: AuthService, useValue: { getEnterpriseId: () => 'enterprise-1' } },
        { provide: NgxPermissionsService, useValue: { getPermission: () => undefined } }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new PosTerminalComponent());
    const group = modifierGroup();
    component.modifierItem.set(menuItem(group));

    expect(component.modifiersValid()).toBeFalse();

    component.toggleModifierOption(group, 'option-1');
    component.toggleModifierOption(group, 'option-2');
    component.toggleModifierOption(group, 'option-3');

    expect(component.selectedModifierOptionIds()).toEqual(['option-1', 'option-2']);
    expect(component.modifiersValid()).toBeTrue();

    component.toggleModifierOption(group, 'option-1');
    component.toggleModifierOption(group, 'option-2');

    expect(component.modifiersValid()).toBeFalse();

    component.selectedModifierOptionIds.set(Array.from({ length: 21 }, (_, index) => `option-${index}`));
    expect(component.modifierLimitExceeded()).toBeTrue();
    expect(component.modifiersValid()).toBeFalse();
    component.selectedModifierOptionIds.set([]);

    component.guestCount.set(0);
    expect(component.guestCountValid()).toBeFalse();
    component.guestCount.set(1);
    expect(component.guestCountValid()).toBeTrue();
    component.guestCount.set(1.5);
    expect(component.guestCountValid()).toBeFalse();
    component.guestCount.set(null);
    expect(component.guestCountValid()).toBeTrue();
  });
});

function modifierGroup(): MenuItemModifierGroup {
  return {
    id: 'group-1',
    enterpriseId: 'enterprise-1',
    name: 'Extras',
    minSelections: 1,
    maxSelections: 2,
    required: true,
    sortOrder: 0,
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
    options: ['option-1', 'option-2', 'option-3'].map((id, sortOrder) => ({
      id,
      enterpriseId: 'enterprise-1',
      groupId: 'group-1',
      name: id,
      priceDeltaGross: '0',
      active: true,
      sortOrder,
      createdAt: '2026-07-25T00:00:00.000Z',
      updatedAt: '2026-07-25T00:00:00.000Z'
    }))
  };
}

function menuItem(group: MenuItemModifierGroup): MenuItem {
  return {
    id: 'item-1',
    enterpriseId: 'enterprise-1',
    categoryId: 'category-1',
    name: 'Burger',
    sku: null,
    description: null,
    imageUrl: null,
    foodPreparationId: null,
    priceGross: '10',
    taxRate: '10',
    trackStock: false,
    kitchenStationId: null,
    sortOrder: 0,
    active: true,
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
    modifierGroups: [group]
  };
}
