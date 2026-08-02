import { Injectable, inject } from '@angular/core';
import { randomUuid } from '@shared/helpers/random-uuid';

import { QueuedPosCommand, PosCommandStatus } from '../models/pos-command.models';
import type { LocalPosOrder } from '../models/pos-local.models';
import {
  DiningArea,
  DiningTable,
  KitchenStation,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  OperationalPosOrder,
  PosBootstrapResponse,
  PosDevice,
  PosOrder,
  PosSettings
} from '../models/pos.models';
import {
  POS_OFFLINE_DATABASE,
  PosOfflineDatabase,
  PosOfflineStoreName,
  PosOfflineTransaction,
  PosOfflineTransactionMode
} from './pos-offline-database';

type GeneratedQueueKey =
  | 'clientMutationId'
  | 'enterpriseId'
  | 'deviceId'
  | 'clientCreatedAt'
  | 'expectedVersion'
  | 'status'
  | 'attempts'
  | 'lastErrorCode'
  | 'nextAttemptAt';

export type QueuedPosCommandInput = QueuedPosCommand extends infer TCommand
  ? TCommand extends QueuedPosCommand
    ? Omit<TCommand, GeneratedQueueKey>
    : never
  : never;

export type OfflineOrderSnapshot = OperationalPosOrder | PosOrder;
export type OfflineStoredOrder = OfflineOrderSnapshot | LocalPosOrder;

export interface CachedPosDevice {
  enterpriseId: string;
  deviceId: string;
  code: string;
  lastValidatedAt: string;
  device?: PosDevice;
  syncCursor?: string;
  lastSyncAt?: string;
}

export interface CachedPosBootstrap {
  enterpriseId: string;
  settings: PosSettings;
  areas: DiningArea[];
  tables: DiningTable[];
  kitchenStations: KitchenStation[];
  menuCategories: MenuCategory[];
  modifierGroups: ModifierGroup[];
  menuItems: MenuItem[];
  cursor: string;
  cachedAt: string;
}

interface OfflineOrderRecord {
  orderId: string;
  enterpriseId: string;
  order: OfflineStoredOrder;
  cachedAt: string;
}

export type PosOfflineStorageErrorCode =
  | 'POS_OFFLINE_STORAGE_UNAVAILABLE'
  | 'POS_OFFLINE_STORAGE_BLOCKED'
  | 'POS_OFFLINE_STORAGE_QUOTA_EXCEEDED'
  | 'POS_OFFLINE_STORAGE_FAILED'
  | 'POS_OFFLINE_NAMESPACE_REQUIRED'
  | 'POS_OFFLINE_NAMESPACE_MISMATCH'
  | 'POS_OFFLINE_COMMAND_NOT_FOUND'
  | 'POS_OFFLINE_DEVICE_NOT_FOUND'
  | 'POS_OFFLINE_RETARGET_REQUIRED'
  | 'POS_OFFLINE_SENSITIVE_COMMAND_NOT_ALLOWED';

export class PosOfflineStorageError extends Error {
  constructor(
    readonly code: PosOfflineStorageErrorCode,
    options?: ErrorOptions
  ) {
    super(code, options);
    this.name = 'PosOfflineStorageError';
  }
}

@Injectable({ providedIn: 'root' })
export class PosOfflineQueueService {
  private readonly database = inject(POS_OFFLINE_DATABASE);
  private enterpriseId: string | null = null;

  async useEnterprise(enterpriseId: string): Promise<void> {
    if (!enterpriseId.trim()) throw new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_REQUIRED');
    await this.recoverSending(enterpriseId);
    this.enterpriseId = enterpriseId;
  }

  currentEnterpriseId(): string | null {
    return this.enterpriseId;
  }

  async saveDevice(device: PosDevice): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    this.assertEnterprise(device.enterpriseId, enterpriseId);
    await this.run(['device'], 'readwrite', async (transaction) => {
      const current = await transaction.get<CachedPosDevice>('device', enterpriseId);
      await transaction.put<CachedPosDevice>('device', {
        enterpriseId,
        deviceId: device.id,
        code: device.code,
        lastValidatedAt: new Date().toISOString(),
        device,
        ...(current?.deviceId === device.id && current.syncCursor ? { syncCursor: current.syncCursor } : {}),
        ...(current?.deviceId === device.id && current.lastSyncAt ? { lastSyncAt: current.lastSyncAt } : {})
      });
    });
  }

  async getDevice(): Promise<CachedPosDevice | null> {
    const enterpriseId = this.requireEnterprise();
    return (
      (await this.run(['device'], 'readonly', (transaction) =>
        transaction.get<CachedPosDevice>('device', enterpriseId)
      )) ?? null
    );
  }

  async clearDevice(): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    await this.run(['device'], 'readwrite', (transaction) => transaction.delete('device', enterpriseId));
  }

  async cacheBootstrap(bootstrap: PosBootstrapResponse): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    this.assertEnterprise(bootstrap.settings.enterpriseId, enterpriseId);
    const cached: CachedPosBootstrap = {
      enterpriseId,
      settings: bootstrap.settings,
      areas: bootstrap.areas,
      tables: bootstrap.tables,
      kitchenStations: bootstrap.kitchenStations,
      menuCategories: bootstrap.menuCategories,
      modifierGroups: bootstrap.modifierGroups,
      menuItems: bootstrap.menuItems,
      cursor: bootstrap.cursor,
      cachedAt: new Date().toISOString()
    };
    await this.run(['bootstrap'], 'readwrite', (transaction) => transaction.put('bootstrap', cached));
  }

  async getCachedBootstrap(): Promise<CachedPosBootstrap | null> {
    const enterpriseId = this.requireEnterprise();
    return (
      (await this.run(['bootstrap'], 'readonly', (transaction) =>
        transaction.get<CachedPosBootstrap>('bootstrap', enterpriseId)
      )) ?? null
    );
  }

  async getSyncCursor(): Promise<string | null> {
    return (await this.getDevice())?.syncCursor ?? null;
  }

  async setSyncCursor(cursor: string | null): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    await this.run(['device'], 'readwrite', async (transaction) => {
      const device = await transaction.get<CachedPosDevice>('device', enterpriseId);
      if (!device) throw new PosOfflineStorageError('POS_OFFLINE_DEVICE_NOT_FOUND');
      await transaction.put('device', {
        ...device,
        syncCursor: cursor ?? undefined,
        lastSyncAt: new Date().toISOString()
      });
    });
  }

  async saveOrder(order: OfflineStoredOrder): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    this.assertEnterprise(order.enterpriseId, enterpriseId);
    await this.run(['orders'], 'readwrite', (transaction) =>
      !('kind' in order) && (order.status === 'PAID' || order.status === 'CANCELLED')
        ? transaction.delete('orders', order.id)
        : transaction.put('orders', this.orderRecord(order, enterpriseId))
    );
  }

  async getOrders(): Promise<OfflineStoredOrder[]> {
    const enterpriseId = this.requireEnterprise();
    const records = await this.run(['orders'], 'readonly', (transaction) =>
      transaction.getAll<OfflineOrderRecord>('orders')
    );
    return records.filter((record) => record.enterpriseId === enterpriseId).map((record) => record.order);
  }

  async enqueue(input: QueuedPosCommandInput): Promise<QueuedPosCommand> {
    const command = this.createCommand(input);
    await this.run(['commands'], 'readwrite', (transaction) => transaction.put('commands', command));
    return command;
  }

  async enqueueWithOrder(order: OfflineStoredOrder, input: QueuedPosCommandInput): Promise<QueuedPosCommand | null> {
    const enterpriseId = this.requireEnterprise();
    this.assertEnterprise(order.enterpriseId, enterpriseId);
    if (input.type !== 'UPDATE_KITCHEN_TICKET' && input.aggregateId !== order.id) {
      throw new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_MISMATCH');
    }

    const command = this.createCommand(input);
    return this.run(['orders', 'commands'], 'readwrite', async (transaction) => {
      await transaction.put('orders', this.orderRecord(order, enterpriseId));
      if (input.type === 'UPDATE_LINE' || input.type === 'REMOVE_LINE') {
        const pendingAdd = await this.findPendingAdd(transaction, enterpriseId, input.aggregateId, input.targetId);
        if (pendingAdd && input.type === 'REMOVE_LINE') {
          await transaction.delete('commands', pendingAdd.clientMutationId);
          return null;
        }
        if (pendingAdd && input.type === 'UPDATE_LINE') {
          const compacted: QueuedPosCommand = {
            ...pendingAdd,
            data: {
              ...pendingAdd.data,
              ...(input.data.quantity !== undefined ? { quantity: input.data.quantity } : {}),
              ...(input.data.discountGross !== undefined ? { discountGross: input.data.discountGross } : {}),
              ...(input.data.note !== undefined ? { note: input.data.note } : {})
            }
          };
          await transaction.put('commands', compacted);
          return compacted;
        }
      }
      await transaction.put('commands', command);
      return command;
    });
  }

  async listCommands(statuses?: readonly PosCommandStatus[]): Promise<QueuedPosCommand[]> {
    const enterpriseId = this.requireEnterprise();
    const commands = await this.run(['commands'], 'readonly', (transaction) =>
      transaction.getAll<QueuedPosCommand>('commands')
    );
    const allowedStatuses = statuses ? new Set(statuses) : null;
    return commands
      .filter(
        (command) => command.enterpriseId === enterpriseId && (!allowedStatuses || allowedStatuses.has(command.status))
      )
      .sort(
        (left, right) =>
          left.clientCreatedAt.localeCompare(right.clientCreatedAt) ||
          left.clientMutationId.localeCompare(right.clientMutationId)
      );
  }

  async markSending(clientMutationId: string): Promise<QueuedPosCommand> {
    return this.updateCommand(clientMutationId, 'SENDING', undefined, true);
  }

  async markPending(clientMutationId: string, errorCode?: string, nextAttemptAt?: string): Promise<QueuedPosCommand> {
    return this.updateCommand(clientMutationId, 'PENDING', errorCode, false, nextAttemptAt);
  }

  async markFailed(clientMutationId: string, errorCode: string): Promise<QueuedPosCommand> {
    return this.updateCommand(clientMutationId, 'FAILED', errorCode);
  }

  async retryAggregateCommands(aggregateId: string): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    await this.run(['commands'], 'readwrite', async (transaction) => {
      const commands = await transaction.getAll<QueuedPosCommand>('commands');
      for (const command of commands) {
        if (
          command.enterpriseId === enterpriseId &&
          command.aggregateId === aggregateId &&
          (command.status === 'PENDING' || command.status === 'FAILED')
        ) {
          await transaction.put('commands', {
            ...command,
            status: 'PENDING',
            lastErrorCode: undefined,
            nextAttemptAt: undefined
          });
        }
      }
    });
  }

  async markConflict(
    clientMutationId: string,
    serverOrder: OfflineOrderSnapshot,
    errorCode = 'ORDER_VERSION_CONFLICT'
  ): Promise<QueuedPosCommand> {
    const enterpriseId = this.requireEnterprise();
    this.assertEnterprise(serverOrder.enterpriseId, enterpriseId);
    return this.run(['orders', 'commands'], 'readwrite', async (transaction) => {
      const command = await this.requireCommand(transaction, clientMutationId, enterpriseId);
      const conflicted = { ...command, status: 'CONFLICT' as const, lastErrorCode: errorCode };
      await transaction.put('orders', this.orderRecord(serverOrder, enterpriseId));
      await transaction.put('commands', conflicted);
      return conflicted;
    });
  }

  async confirmCommand(
    clientMutationId: string,
    authoritativeOrder?: OfflineOrderSnapshot,
    authoritativeTargetId?: string
  ): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    if (authoritativeOrder) this.assertEnterprise(authoritativeOrder.enterpriseId, enterpriseId);
    await this.run(['orders', 'commands'], 'readwrite', async (transaction) => {
      const command = await this.requireCommand(transaction, clientMutationId, enterpriseId);
      await transaction.delete('commands', clientMutationId);
      if (!authoritativeOrder) return;

      if (command.type === 'CREATE_ORDER' && command.aggregateId !== authoritativeOrder.id) {
        const commands = await transaction.getAll<QueuedPosCommand>('commands');
        for (const pending of commands) {
          if (
            pending.enterpriseId === enterpriseId &&
            pending.type !== 'UPDATE_KITCHEN_TICKET' &&
            pending.aggregateId === command.aggregateId
          ) {
            await transaction.put('commands', { ...pending, aggregateId: authoritativeOrder.id });
          }
        }
        await transaction.delete('orders', command.aggregateId);
      }
      if (command.type === 'ADD_LINE') {
        if (!authoritativeTargetId) throw new PosOfflineStorageError('POS_OFFLINE_RETARGET_REQUIRED');
        const commands = await transaction.getAll<QueuedPosCommand>('commands');
        for (const pending of commands) {
          if (
            pending.enterpriseId === enterpriseId &&
            (pending.type === 'UPDATE_LINE' || pending.type === 'REMOVE_LINE') &&
            pending.aggregateId === command.aggregateId &&
            pending.targetId === command.targetId
          ) {
            await transaction.put('commands', { ...pending, targetId: authoritativeTargetId });
          }
        }
      }
      if (authoritativeOrder.status === 'PAID' || authoritativeOrder.status === 'CANCELLED') {
        await transaction.delete('orders', authoritativeOrder.id);
      } else {
        await transaction.put('orders', this.orderRecord(authoritativeOrder, enterpriseId));
      }
      if (command.aggregateId !== authoritativeOrder.id && command.type !== 'CREATE_ORDER') {
        throw new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_MISMATCH');
      }

      let expectedVersion = authoritativeOrder.version;
      const aggregateId = command.type === 'CREATE_ORDER' ? authoritativeOrder.id : command.aggregateId;
      const pendingCommands = (await transaction.getAll<QueuedPosCommand>('commands'))
        .filter(
          (pending) =>
            pending.enterpriseId === enterpriseId &&
            pending.aggregateId === aggregateId &&
            pending.status === 'PENDING' &&
            'expectedVersion' in pending.data
        )
        .sort(
          (left, right) =>
            left.clientCreatedAt.localeCompare(right.clientCreatedAt) ||
            left.clientMutationId.localeCompare(right.clientMutationId)
        );
      for (const pending of pendingCommands) {
        await transaction.put('commands', {
          ...pending,
          expectedVersion,
          data: { ...pending.data, expectedVersion }
        });
        expectedVersion++;
      }
    });
  }

  async replaceOrdersAfterConfirmedBootstrap(orders: readonly OfflineOrderSnapshot[]): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    orders.forEach((order) => this.assertEnterprise(order.enterpriseId, enterpriseId));
    await this.run(['orders'], 'readwrite', async (transaction) => {
      const records = await transaction.getAll<OfflineOrderRecord>('orders');
      for (const record of records) {
        if (record.enterpriseId === enterpriseId) await transaction.delete('orders', record.orderId);
      }
      for (const order of orders) await transaction.put('orders', this.orderRecord(order, enterpriseId));
    });
  }

  async pendingCount(): Promise<number> {
    return (await this.listCommands(['PENDING', 'SENDING', 'CONFLICT', 'FAILED'])).length;
  }

  async discardAggregateCommands(aggregateId: string, authoritativeOrder?: OfflineOrderSnapshot): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    if (authoritativeOrder) this.assertEnterprise(authoritativeOrder.enterpriseId, enterpriseId);
    await this.run(['orders', 'commands'], 'readwrite', async (transaction) => {
      const commands = await transaction.getAll<QueuedPosCommand>('commands');
      for (const command of commands) {
        if (command.enterpriseId === enterpriseId && command.aggregateId === aggregateId) {
          await transaction.delete('commands', command.clientMutationId);
        }
      }
      await transaction.delete('orders', aggregateId);
      if (authoritativeOrder && authoritativeOrder.status !== 'PAID' && authoritativeOrder.status !== 'CANCELLED') {
        await transaction.put('orders', this.orderRecord(authoritativeOrder, enterpriseId));
      }
    });
  }

  async clearCurrentEnterprise(): Promise<void> {
    const enterpriseId = this.requireEnterprise();
    await this.run(['device', 'bootstrap', 'orders', 'commands'], 'readwrite', async (transaction) => {
      await transaction.delete('device', enterpriseId);
      await transaction.delete('bootstrap', enterpriseId);
      const orders = await transaction.getAll<OfflineOrderRecord>('orders');
      for (const order of orders) {
        if (order.enterpriseId === enterpriseId) await transaction.delete('orders', order.orderId);
      }
      const commands = await transaction.getAll<QueuedPosCommand>('commands');
      for (const command of commands) {
        if (command.enterpriseId === enterpriseId) await transaction.delete('commands', command.clientMutationId);
      }
    });
  }

  close(): void {
    this.enterpriseId = null;
    this.database.close();
  }

  replayRequest(command: QueuedPosCommand): { body: QueuedPosCommand['data']; idempotencyKey: string } {
    return { body: command.data, idempotencyKey: command.clientMutationId };
  }

  private createCommand(input: QueuedPosCommandInput): QueuedPosCommand {
    const enterpriseId = this.requireEnterprise();
    if (input.data.enterpriseId) this.assertEnterprise(input.data.enterpriseId, enterpriseId);
    if (
      !['CREATE_ORDER', 'ADD_LINE', 'UPDATE_LINE', 'REMOVE_LINE', 'SEND_ORDER'].includes(input.type) ||
      !('deviceId' in input.data)
    ) {
      throw new PosOfflineStorageError('POS_OFFLINE_SENSITIVE_COMMAND_NOT_ALLOWED');
    }

    return {
      ...input,
      clientMutationId: randomUuid(),
      enterpriseId,
      deviceId: input.data.deviceId,
      clientCreatedAt: input.data.clientCreatedAt,
      ...('expectedVersion' in input.data ? { expectedVersion: input.data.expectedVersion } : {}),
      status: 'PENDING',
      attempts: 0
    } as QueuedPosCommand;
  }

  private async updateCommand(
    clientMutationId: string,
    status: PosCommandStatus,
    errorCode?: string,
    incrementAttempts = false,
    nextAttemptAt?: string
  ): Promise<QueuedPosCommand> {
    const enterpriseId = this.requireEnterprise();
    return this.run(['commands'], 'readwrite', async (transaction) => {
      const command = await this.requireCommand(transaction, clientMutationId, enterpriseId);
      const updated: QueuedPosCommand = {
        ...command,
        status,
        attempts: command.attempts + (incrementAttempts ? 1 : 0),
        ...(errorCode ? { lastErrorCode: errorCode } : { lastErrorCode: undefined }),
        ...(nextAttemptAt ? { nextAttemptAt } : { nextAttemptAt: undefined })
      };
      await transaction.put('commands', updated);
      return updated;
    });
  }

  private async recoverSending(enterpriseId: string): Promise<void> {
    await this.run(['commands'], 'readwrite', async (transaction) => {
      const commands = await transaction.getAll<QueuedPosCommand>('commands');
      for (const command of commands) {
        if (command.enterpriseId === enterpriseId && command.status === 'SENDING') {
          await transaction.put('commands', { ...command, status: 'PENDING', nextAttemptAt: undefined });
        }
      }
    });
  }

  private async requireCommand(
    transaction: PosOfflineTransaction,
    clientMutationId: string,
    enterpriseId: string
  ): Promise<QueuedPosCommand> {
    const command = await transaction.get<QueuedPosCommand>('commands', clientMutationId);
    if (!command) throw new PosOfflineStorageError('POS_OFFLINE_COMMAND_NOT_FOUND');
    this.assertEnterprise(command.enterpriseId, enterpriseId);
    return command;
  }

  private async findPendingAdd(
    transaction: PosOfflineTransaction,
    enterpriseId: string,
    aggregateId: string,
    targetId: string
  ): Promise<Extract<QueuedPosCommand, { type: 'ADD_LINE' }> | undefined> {
    const commands = await transaction.getAll<QueuedPosCommand>('commands');
    return commands.find(
      (command): command is Extract<QueuedPosCommand, { type: 'ADD_LINE' }> =>
        command.enterpriseId === enterpriseId &&
        command.type === 'ADD_LINE' &&
        command.aggregateId === aggregateId &&
        command.targetId === targetId &&
        command.status === 'PENDING'
    );
  }

  private orderRecord(order: OfflineStoredOrder, enterpriseId: string): OfflineOrderRecord {
    return {
      orderId: order.id,
      enterpriseId,
      order: 'kind' in order ? order : { ...order, fiscalDocuments: [] },
      cachedAt: new Date().toISOString()
    };
  }

  private requireEnterprise(): string {
    if (!this.enterpriseId) throw new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_REQUIRED');
    return this.enterpriseId;
  }

  private assertEnterprise(actual: string, expected: string): void {
    if (actual !== expected) throw new PosOfflineStorageError('POS_OFFLINE_NAMESPACE_MISMATCH');
  }

  private async run<T>(
    stores: readonly PosOfflineStoreName[],
    mode: PosOfflineTransactionMode,
    work: (transaction: PosOfflineTransaction) => Promise<T>
  ): Promise<T> {
    try {
      return await this.database.transaction(stores, mode, work);
    } catch (error: unknown) {
      if (error instanceof PosOfflineStorageError) throw error;
      if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new PosOfflineStorageError('POS_OFFLINE_STORAGE_QUOTA_EXCEEDED', { cause: error });
      }
      if (error instanceof Error && isStorageErrorCode(error.message)) {
        throw new PosOfflineStorageError(error.message, { cause: error });
      }
      throw new PosOfflineStorageError('POS_OFFLINE_STORAGE_FAILED', { cause: error });
    }
  }
}

function isStorageErrorCode(value: string): value is PosOfflineStorageErrorCode {
  return [
    'POS_OFFLINE_STORAGE_UNAVAILABLE',
    'POS_OFFLINE_STORAGE_BLOCKED',
    'POS_OFFLINE_STORAGE_QUOTA_EXCEEDED',
    'POS_OFFLINE_STORAGE_FAILED',
    'POS_OFFLINE_NAMESPACE_REQUIRED',
    'POS_OFFLINE_NAMESPACE_MISMATCH',
    'POS_OFFLINE_COMMAND_NOT_FOUND',
    'POS_OFFLINE_DEVICE_NOT_FOUND',
    'POS_OFFLINE_RETARGET_REQUIRED',
    'POS_OFFLINE_SENSITIVE_COMMAND_NOT_ALLOWED'
  ].includes(value);
}
