import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { QueuedPosCommand } from '../models/pos-command.models';
import { OperationalPosOrder, PosOperationalChange, PosOperationalSyncResponse, PosOrder } from '../models/pos.models';
import { OfflineOrderSnapshot, PosOfflineQueueService, PosOfflineStorageError } from './pos-offline-queue.service';
import { PosSyncCallbacks, PosSyncService } from './pos-sync.service';
import { PosService } from './pos.service';
import { PosTelemetryService } from './pos-telemetry.service';

describe('PosSyncService', () => {
  let queue: FakeQueue;
  let posService: jasmine.SpyObj<PosService>;
  let service: PosSyncService;
  let telemetry: PosTelemetryService;
  let callbacks: PosSyncCallbacks;

  beforeEach(() => {
    queue = new FakeQueue();
    posService = jasmine.createSpyObj<PosService>('PosService', [
      'createOrder',
      'addLine',
      'updateLine',
      'removeLine',
      'sendOrder',
      'getOrder',
      'getSync'
    ]);
    callbacks = {
      applyAuthoritativeOrder: jasmine.createSpy('applyAuthoritativeOrder'),
      applyOperationalChanges: jasmine.createSpy('applyOperationalChanges')
    };
    TestBed.configureTestingModule({
      providers: [
        PosSyncService,
        { provide: PosService, useValue: posService },
        { provide: PosOfflineQueueService, useValue: queue }
      ]
    });
    service = TestBed.inject(PosSyncService);
    telemetry = TestBed.inject(PosTelemetryService);
    service.start(callbacks);
  });

  afterEach(() => service.stop());

  it('replays sequentially by clientCreatedAt and uses the mutation id as the idempotency key', async () => {
    queue.commands = [sendCommand('second', 'order-2', '2026-07-27T10:00:02.000Z'), sendCommand('first', 'order-1')];
    const calls: string[] = [];
    posService.sendOrder.and.callFake((orderId, _data, key) => {
      calls.push(`${orderId}:${key}`);
      return of(order(orderId));
    });
    posService.getSync.and.returnValue(of({ changes: [], serverCursor: 'cursor-1' }));

    await service.requestSync();

    expect(calls).toEqual(['order-1:first', 'order-2:second']);
    expect(queue.confirmed).toEqual(['first', 'second']);
  });

  it('uses the employee credential for paired terminal replay and sync', async () => {
    service.start(callbacks, 'DEVICE_EMPLOYEE', 'user-1');
    queue.commands = [sendCommand('employee-command', 'order-1', undefined, 'user-1')];
    posService.sendOrder.and.returnValue(of(order('order-1')));
    posService.getSync.and.returnValue(of({ changes: [], serverCursor: 'cursor-1' }));

    await service.requestSync();

    expect(posService.sendOrder.calls.mostRecent().args[3]).toBe('DEVICE_EMPLOYEE');
    expect(posService.getSync.calls.mostRecent().args[3]).toBe('DEVICE_EMPLOYEE');
  });

  it('keeps a pending command untouched when a different employee tries to replay it', async () => {
    callbacks.error = jasmine.createSpy('error');
    service.start(callbacks, 'DEVICE_EMPLOYEE', 'user-2');
    queue.commands = [sendCommand('employee-command', 'order-1', undefined, 'user-1')];

    await service.requestSync();

    expect(posService.sendOrder).not.toHaveBeenCalled();
    expect(queue.commands[0].status).toBe('PENDING');
    expect(queue.commands[0].attempts).toBe(0);
    expect(callbacks.error).toHaveBeenCalledOnceWith('POS_OFFLINE_EMPLOYEE_MISMATCH');
  });

  it('returns transient failures to PENDING with backoff and continues another aggregate', async () => {
    queue.commands = [sendCommand('retry', 'order-1'), sendCommand('other', 'order-2', '2026-07-27T10:00:02.000Z')];
    posService.sendOrder.and.callFake((orderId) =>
      orderId === 'order-1'
        ? throwError(() => new HttpErrorResponse({ status: 500, error: { code: 'UPSTREAM_FAILED' } }))
        : of(order(orderId))
    );

    await service.requestSync();

    const retry = queue.commands.find(({ clientMutationId }) => clientMutationId === 'retry');
    expect(retry?.status).toBe('PENDING');
    expect(retry?.lastErrorCode).toBe('UPSTREAM_FAILED');
    expect(retry?.nextAttemptAt).toBeDefined();
    expect(queue.confirmed).toEqual(['other']);
    expect(posService.getSync).not.toHaveBeenCalled();
    expect(telemetry.snapshot()).toContain(
      jasmine.objectContaining({
        type: 'SYNC_ERROR',
        phase: 'COMMAND',
        errorCode: 'UPSTREAM_FAILED',
        transient: true
      })
    );
  });

  it('stops only the conflicted aggregate, refreshes it, and continues another order', async () => {
    queue.commands = [
      sendCommand('conflict', 'order-1'),
      sendCommand('blocked', 'order-1', '2026-07-27T10:00:02.000Z'),
      sendCommand('other', 'order-2', '2026-07-27T10:00:03.000Z')
    ];
    posService.sendOrder.and.callFake((orderId) =>
      orderId === 'order-1'
        ? throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'ORDER_VERSION_CONFLICT' } }))
        : of(order(orderId))
    );
    posService.getOrder.and.returnValue(of(order('order-1', 4)));
    posService.getSync.and.returnValue(of({ changes: [], serverCursor: 'cursor-after-conflict' }));

    await service.requestSync();

    expect(posService.getOrder).toHaveBeenCalledOnceWith('order-1', undefined, 'HUMAN');
    expect(queue.commands.find(({ clientMutationId }) => clientMutationId === 'conflict')?.status).toBe('CONFLICT');
    expect(queue.commands.find(({ clientMutationId }) => clientMutationId === 'blocked')?.status).toBe('PENDING');
    expect(queue.confirmed).toEqual(['other']);
    expect(posService.getSync).toHaveBeenCalled();

    await service.requestSync();
    expect(posService.sendOrder.calls.allArgs().filter(([orderId]) => orderId === 'order-1')).toHaveSize(1);
  });

  it('drops only an invalid operational cursor and rebuilds that stream', async () => {
    posService.getSync.and.callFake((_deviceId, cursor) =>
      cursor
        ? throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'INVALID_SYNC_CURSOR' } }))
        : of({ changes: [], serverCursor: 'rebuilt-cursor' })
    );

    await service.requestSync();

    expect(posService.getSync.calls.allArgs()).toEqual([
      ['device-1', 'cursor-0', undefined, 'HUMAN'],
      ['device-1', undefined, undefined, 'HUMAN']
    ]);
    expect(queue.cursor).toBe('rebuilt-cursor');
    expect(telemetry.snapshot()).toContain(jasmine.objectContaining({ type: 'SYNC_CYCLE', outcome: 'COMPLETED' }));
  });

  it('marks the sync cycle as failed when operational changes cannot be read', async () => {
    posService.getSync.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 503, error: { code: 'UPSTREAM_FAILED' } }))
    );

    await service.requestSync();

    expect(telemetry.snapshot()).toContain(
      jasmine.objectContaining({ type: 'SYNC_ERROR', phase: 'OPERATIONAL', errorCode: 'UPSTREAM_FAILED' })
    );
    expect(telemetry.snapshot()).toContain(jasmine.objectContaining({ type: 'SYNC_CYCLE', outcome: 'FAILED' }));
  });

  it('does not apply an in-flight response after stop invalidates the session', async () => {
    const response = new Subject<PosOrder>();
    queue.commands = [sendCommand('in-flight', 'order-1')];
    posService.sendOrder.and.returnValue(response);

    const drain = service.requestSync();
    await new Promise<void>((resolve) => setTimeout(resolve));
    service.stop();
    response.next(order('order-1'));
    response.complete();
    await drain;

    expect(queue.confirmed).toEqual([]);
    expect(callbacks.applyAuthoritativeOrder).not.toHaveBeenCalled();
    expect(queue.commands[0].status).toBe('SENDING');
    expect(telemetry.snapshot()).toContain(jasmine.objectContaining({ type: 'SYNC_CYCLE', outcome: 'CANCELLED' }));
  });

  it('records storage failures as non-transient without serializing the error', async () => {
    spyOn(queue, 'listCommands').and.rejectWith(new PosOfflineStorageError('POS_OFFLINE_STORAGE_QUOTA_EXCEEDED'));

    await expectAsync(service.requestSync()).toBeRejected();

    expect(telemetry.snapshot()).toContain(
      jasmine.objectContaining({
        type: 'SYNC_ERROR',
        phase: 'STORAGE',
        errorCode: 'POS_OFFLINE_STORAGE_QUOTA_EXCEEDED',
        transient: false
      })
    );
    expect(telemetry.snapshot()).toContain(jasmine.objectContaining({ type: 'SYNC_CYCLE', outcome: 'FAILED' }));
  });

  it('persists the opaque cursor and coalesces concurrent sync requests', async () => {
    const response = new Subject<PosOperationalSyncResponse>();
    posService.getSync.and.returnValue(response);

    const first = service.requestSync();
    const coalesced = service.requestSync();
    await new Promise<void>((resolve) => setTimeout(resolve));
    expect(posService.getSync).toHaveBeenCalledOnceWith('device-1', 'cursor-0', undefined, 'HUMAN');

    response.next({ changes: [change()], serverCursor: 'opaque-cursor-1' });
    response.complete();
    await Promise.all([first, coalesced]);

    expect(queue.cursor).toBe('opaque-cursor-1');
    expect(callbacks.applyOperationalChanges).toHaveBeenCalledTimes(1);
    expect(posService.getSync).toHaveBeenCalledTimes(1);
  });
});

class FakeQueue {
  commands: QueuedPosCommand[] = [];
  orders: OfflineOrderSnapshot[] = [];
  confirmed: string[] = [];
  cursor: string | null = 'cursor-0';

  async listCommands(statuses?: readonly string[]): Promise<QueuedPosCommand[]> {
    return this.commands
      .filter((command) => !statuses || statuses.includes(command.status))
      .sort((left, right) => left.clientCreatedAt.localeCompare(right.clientCreatedAt));
  }

  async markSending(id: string): Promise<QueuedPosCommand> {
    return this.update(id, { status: 'SENDING', attempts: this.require(id).attempts + 1, nextAttemptAt: undefined });
  }

  async markPending(id: string, lastErrorCode?: string, nextAttemptAt?: string): Promise<QueuedPosCommand> {
    return this.update(id, { status: 'PENDING', lastErrorCode, nextAttemptAt });
  }

  async markFailed(id: string, lastErrorCode: string): Promise<QueuedPosCommand> {
    return this.update(id, { status: 'FAILED', lastErrorCode, nextAttemptAt: undefined });
  }

  async markConflict(id: string, serverOrder: OfflineOrderSnapshot, lastErrorCode?: string): Promise<QueuedPosCommand> {
    this.orders = [serverOrder];
    return this.update(id, { status: 'CONFLICT', lastErrorCode });
  }

  async confirmCommand(id: string, authoritativeOrder?: OfflineOrderSnapshot): Promise<void> {
    this.confirmed.push(id);
    this.commands = this.commands.filter((command) => command.clientMutationId !== id);
    if (authoritativeOrder) this.orders = [authoritativeOrder];
  }

  async getOrders(): Promise<OfflineOrderSnapshot[]> {
    return this.orders;
  }

  async getDevice(): Promise<{ deviceId: string } | null> {
    return { deviceId: 'device-1' };
  }

  async getSyncCursor(): Promise<string | null> {
    return this.cursor;
  }

  async setSyncCursor(cursor: string | null): Promise<void> {
    this.cursor = cursor;
  }

  private require(id: string): QueuedPosCommand {
    const command = this.commands.find(({ clientMutationId }) => clientMutationId === id);
    if (!command) throw new Error('COMMAND_NOT_FOUND');
    return command;
  }

  private update(id: string, values: Partial<QueuedPosCommand>): QueuedPosCommand {
    const command = { ...this.require(id), ...values } as QueuedPosCommand;
    this.commands = this.commands.map((item) => (item.clientMutationId === id ? command : item));
    return command;
  }
}

function sendCommand(
  clientMutationId: string,
  aggregateId: string,
  clientCreatedAt = '2026-07-27T10:00:01.000Z',
  employeeId?: string
): QueuedPosCommand {
  return {
    clientMutationId,
    aggregateId,
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    ...(employeeId ? { employeeId } : {}),
    clientCreatedAt,
    expectedVersion: 1,
    type: 'SEND_ORDER',
    data: { deviceId: 'device-1', clientCreatedAt, expectedVersion: 1 },
    status: 'PENDING',
    attempts: 0
  };
}

function order(id: string, version = 2): PosOrder {
  return {
    id,
    enterpriseId: 'enterprise-1',
    deviceId: 'device-1',
    tableId: null,
    orderDate: '2026-07-27',
    orderNumber: 1,
    channel: 'TAKEAWAY',
    status: 'OPEN',
    guestCount: null,
    note: null,
    version,
    subtotalGross: '0',
    discountGross: '0',
    taxGross: '0',
    totalGross: '0',
    paidGross: '0',
    costNet: null,
    costStatus: 'PENDING',
    openedByUserId: 'user-1',
    closedByUserId: null,
    cancelledByUserId: null,
    cancellationReason: null,
    openedAt: '2026-07-27T10:00:00.000Z',
    closedAt: null,
    cancelledAt: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    lines: [],
    kitchenTickets: [],
    payments: [],
    refunds: [],
    fiscalDocuments: []
  };
}

function change(): PosOperationalChange {
  return {
    resourceType: 'POS_ORDER',
    resourceId: 'order-1',
    operation: 'UPSERT',
    updatedAt: '2026-07-27T10:00:00.000Z',
    data: { ...order('order-1'), stockSyncJob: null } as OperationalPosOrder
  };
}
