import { QueuedPosCommand } from './pos-command.models';
import { MenuItem } from './pos.models';
import { createLocalOrderIdentity, LocalPosOrder, projectPosOrder } from './pos-local.models';

describe('POS local order models', () => {
  it('creates a stable local identity and never invents a server order number', () => {
    const identity = createLocalOrderIdentity('12345678-1234-4234-8234-123456789012');

    expect(identity).toEqual({
      id: 'local:12345678-1234-4234-8234-123456789012',
      temporaryNumber: 'L-12345678'
    });
    expect('orderNumber' in identity).toBeFalse();
  });

  it('rebuilds the same projection after a serialized reload', () => {
    const create = createCommand('local:12345678-1234-4234-8234-123456789012');
    const add = addLineCommand('line-local-1', '2');
    const local = localOrder(create);
    const reloaded = JSON.parse(JSON.stringify({ local, commands: [create, add] })) as {
      local: typeof local;
      commands: QueuedPosCommand[];
    };

    const projection = projectPosOrder({
      aggregateId: local.id,
      localOrder: reloaded.local,
      commands: reloaded.commands,
      menuItems: [menuItem()]
    });

    expect(projection.displayNumber).toBe('L-12345678');
    expect(projection.orderNumber).toBeNull();
    expect(projection.lines.map(({ id }) => id)).toEqual(['line-local-1']);
    expect(projection.syncStatus).toBe('PENDING');
  });

  it('calculates item and modifier totals exactly without floating point arithmetic', () => {
    const create = createCommand('local:12345678-1234-4234-8234-123456789012');
    const add = addLineCommand('line-local-1', '2', ['modifier-1', 'modifier-2'], '0.10');
    const projection = projectPosOrder({
      aggregateId: create.aggregateId,
      localOrder: localOrder(create),
      commands: [create, add],
      menuItems: [menuItem()]
    });

    expect(projection.lines[0].modifiers.map(({ name }) => name)).toEqual(['Cheese', 'Sauce']);
    expect(projection.lines[0].estimatedLineTotalGross).toBe('21.20');
    expect(projection.estimatedTotalGross).toBe('21.20');
  });
});

function localOrder(command: Extract<QueuedPosCommand, { type: 'CREATE_ORDER' }>): LocalPosOrder {
  return {
    kind: 'LOCAL_POS_ORDER',
    id: command.aggregateId,
    temporaryNumber: 'L-12345678',
    enterpriseId: command.enterpriseId,
    deviceId: command.deviceId,
    tableId: command.data.tableId ?? null,
    channel: command.data.channel,
    guestCount: command.data.guestCount ?? null,
    note: command.data.note ?? null,
    clientCreatedAt: command.clientCreatedAt
  };
}

function createCommand(aggregateId: string): Extract<QueuedPosCommand, { type: 'CREATE_ORDER' }> {
  return {
    clientMutationId: 'create-mutation',
    aggregateId,
    deviceId: 'device-1',
    enterpriseId: 'enterprise-1',
    clientCreatedAt: '2026-07-27T10:00:00.000Z',
    type: 'CREATE_ORDER',
    data: {
      deviceId: 'device-1',
      clientCreatedAt: '2026-07-27T10:00:00.000Z',
      channel: 'TAKEAWAY'
    },
    status: 'PENDING',
    attempts: 0
  };
}

function addLineCommand(
  targetId: string,
  quantity: string,
  modifierOptionIds?: string[],
  discountGross?: string
): Extract<QueuedPosCommand, { type: 'ADD_LINE' }> {
  return {
    clientMutationId: `add-${targetId}`,
    aggregateId: 'local:12345678-1234-4234-8234-123456789012',
    targetId,
    deviceId: 'device-1',
    enterpriseId: 'enterprise-1',
    clientCreatedAt: '2026-07-27T10:00:01.000Z',
    expectedVersion: 1,
    type: 'ADD_LINE',
    data: {
      deviceId: 'device-1',
      clientCreatedAt: '2026-07-27T10:00:01.000Z',
      expectedVersion: 1,
      menuItemId: 'item-1',
      quantity,
      ...(modifierOptionIds ? { modifierOptionIds } : {}),
      ...(discountGross ? { discountGross } : {})
    },
    status: 'PENDING',
    attempts: 0
  };
}

function menuItem(): MenuItem {
  const timestamp = '2026-07-27T00:00:00.000Z';
  return {
    id: 'item-1',
    enterpriseId: 'enterprise-1',
    categoryId: 'category-1',
    name: 'Burger',
    sku: 'BURGER',
    description: null,
    imageUrl: null,
    foodPreparationId: null,
    priceGross: '10.25',
    taxRate: '10',
    trackStock: false,
    kitchenStationId: null,
    sortOrder: 0,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    modifierGroups: [
      {
        id: 'group-1',
        enterpriseId: 'enterprise-1',
        name: 'Extras',
        minSelections: 0,
        maxSelections: 2,
        required: false,
        sortOrder: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        options: [
          {
            id: 'modifier-1',
            enterpriseId: 'enterprise-1',
            groupId: 'group-1',
            name: 'Cheese',
            priceDeltaGross: '0.30',
            active: true,
            sortOrder: 0,
            createdAt: timestamp,
            updatedAt: timestamp
          },
          {
            id: 'modifier-2',
            enterpriseId: 'enterprise-1',
            groupId: 'group-1',
            name: 'Sauce',
            priceDeltaGross: '0.10',
            active: true,
            sortOrder: 1,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ]
      }
    ]
  };
}
