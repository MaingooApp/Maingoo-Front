import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { QueuedPosCommand } from '../models/pos-command.models';
import { PosOperationalChange, PosOrder } from '../models/pos.models';
import { PosOfflineQueueService } from './pos-offline-queue.service';
import { PosService } from './pos.service';

export interface PosSyncCallbacks {
  applyAuthoritativeOrder(order: PosOrder): void | Promise<void>;
  applyOperationalChanges(changes: readonly PosOperationalChange[]): void | Promise<void>;
  commandChanged?(command: QueuedPosCommand): void | Promise<void>;
  conflict?(command: QueuedPosCommand, order: PosOrder, errorCode: string): void | Promise<void>;
  error?(errorCode: string): void | Promise<void>;
  syncing?(active: boolean): void | Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class PosSyncService {
  private readonly posService = inject(PosService);
  private readonly queue = inject(PosOfflineQueueService);
  private activeDrain: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: PosSyncCallbacks | null = null;
  private generation = 0;

  start(callbacks: PosSyncCallbacks): void {
    this.generation++;
    this.callbacks = callbacks;
  }

  requestSync(): Promise<void> {
    const callbacks = this.callbacks;
    if (!callbacks) return Promise.resolve();
    if (this.activeDrain) return this.activeDrain;
    const generation = this.generation;

    const drain = this.drain(callbacks, generation).finally(() => {
      if (this.activeDrain === drain) this.activeDrain = null;
    });
    this.activeDrain = drain;
    return drain;
  }

  stop(): void {
    this.generation++;
    this.callbacks = null;
    this.activeDrain = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private async drain(callbacks: PosSyncCallbacks, generation: number): Promise<void> {
    await this.notify(callbacks.syncing, true);
    try {
      const canSync = await this.replayPending(callbacks, generation);
      if (canSync && this.isActive(callbacks, generation) && !(await this.hasExecutableCommands())) {
        await this.drainOperationalChanges(callbacks, generation);
      }
    } finally {
      if (this.isActive(callbacks, generation)) await this.notify(callbacks.syncing, false);
    }
  }

  private async hasExecutableCommands(): Promise<boolean> {
    const commands = await this.queue.listCommands();
    const blocked = new Set(
      commands
        .filter(({ status }) => status === 'CONFLICT' || status === 'FAILED')
        .map(({ aggregateId }) => aggregateId)
    );
    return commands.some(
      ({ aggregateId, status }) => (status === 'PENDING' || status === 'SENDING') && !blocked.has(aggregateId)
    );
  }

  private async replayPending(callbacks: PosSyncCallbacks, generation: number): Promise<boolean> {
    const blockedAggregates = new Set(
      (await this.queue.listCommands(['CONFLICT', 'FAILED'])).map(({ aggregateId }) => aggregateId)
    );

    while (true) {
      if (!this.isActive(callbacks, generation)) return false;
      const commands = await this.queue.listCommands(['PENDING']);
      const command = commands.find((candidate) => !blockedAggregates.has(candidate.aggregateId));
      if (!command) return true;

      if (command.nextAttemptAt && Date.parse(command.nextAttemptAt) > Date.now()) {
        blockedAggregates.add(command.aggregateId);
        this.scheduleRetry(Date.parse(command.nextAttemptAt) - Date.now());
        continue;
      }

      const sending = await this.queue.markSending(command.clientMutationId);
      await this.notify(callbacks.commandChanged, sending);
      try {
        const outcome = await this.dispatch(sending, callbacks, generation);
        if (outcome === 'BLOCK_AGGREGATE') blockedAggregates.add(sending.aggregateId);
      } catch (error: unknown) {
        if (!this.isActive(callbacks, generation)) return false;
        const outcome = await this.handleCommandError(sending, error, callbacks, generation);
        if (outcome === 'STOP_QUEUE') return false;
        blockedAggregates.add(sending.aggregateId);
      }
    }
  }

  private async dispatch(
    command: QueuedPosCommand,
    callbacks: PosSyncCallbacks,
    generation: number
  ): Promise<'CONTINUE' | 'BLOCK_AGGREGATE'> {
    const key = command.clientMutationId;
    let order: PosOrder;

    switch (command.type) {
      case 'CREATE_ORDER':
        order = await firstValueFrom(this.posService.createOrder(command.data, key));
        this.assertActive(callbacks, generation);
        await this.queue.confirmCommand(key, order);
        break;
      case 'ADD_LINE': {
        const previous = (await this.queue.getOrders()).find((item) => item.id === command.aggregateId);
        if (!previous || 'kind' in previous) {
          throw new PosSyncCommandError('POS_OFFLINE_ORDER_SNAPSHOT_MISSING', 422);
        }
        order = await firstValueFrom(this.posService.addLine(command.aggregateId, command.data, key));
        this.assertActive(callbacks, generation);
        const previousIds = new Set(previous.lines.map((line) => line.id));
        const addedIds = order.lines.map((line) => line.id).filter((lineId) => !previousIds.has(lineId));
        if (addedIds.length !== 1) {
          const conflicted = await this.queue.markConflict(key, order, 'POS_OFFLINE_LINE_RETARGET_AMBIGUOUS');
          await this.notify(callbacks.commandChanged, conflicted);
          await this.notify(callbacks.applyAuthoritativeOrder, order);
          await this.notify(callbacks.conflict, conflicted, order, 'POS_OFFLINE_LINE_RETARGET_AMBIGUOUS');
          return 'BLOCK_AGGREGATE';
        }
        await this.queue.confirmCommand(key, order, addedIds[0]);
        break;
      }
      case 'UPDATE_LINE':
        order = await firstValueFrom(
          this.posService.updateLine(command.aggregateId, command.targetId, command.data, key)
        );
        this.assertActive(callbacks, generation);
        await this.queue.confirmCommand(key, order);
        break;
      case 'REMOVE_LINE':
        order = await firstValueFrom(
          this.posService.removeLine(command.aggregateId, command.targetId, command.data, key)
        );
        this.assertActive(callbacks, generation);
        await this.queue.confirmCommand(key, order);
        break;
      case 'SEND_ORDER':
        order = await firstValueFrom(this.posService.sendOrder(command.aggregateId, command.data, key));
        this.assertActive(callbacks, generation);
        await this.queue.confirmCommand(key, order);
        break;
      case 'ADD_PAYMENT':
      case 'FINALIZE_ORDER':
      case 'UPDATE_KITCHEN_TICKET':
        throw new PosSyncCommandError('POS_OFFLINE_SENSITIVE_COMMAND_NOT_ALLOWED', 422);
      default:
        return assertNever(command);
    }

    await this.notify(callbacks.applyAuthoritativeOrder, order);
    return 'CONTINUE';
  }

  private async handleCommandError(
    command: QueuedPosCommand,
    error: unknown,
    callbacks: PosSyncCallbacks,
    generation: number
  ): Promise<'BLOCK_AGGREGATE' | 'STOP_QUEUE'> {
    const code = errorCode(error);
    if (code === 'DEVICE_REVOKED') {
      await this.failEntireQueue('DEVICE_REVOKED', callbacks);
      await this.notify(callbacks.error, 'DEVICE_REVOKED');
      return 'STOP_QUEUE';
    }

    if (code === 'ORDER_VERSION_CONFLICT') {
      try {
        const order = await firstValueFrom(this.posService.getOrder(command.aggregateId));
        this.assertActive(callbacks, generation);
        const conflicted = await this.queue.markConflict(command.clientMutationId, order, code);
        await this.notify(callbacks.commandChanged, conflicted);
        await this.notify(callbacks.applyAuthoritativeOrder, order);
        await this.notify(callbacks.conflict, conflicted, order, code);
        return 'BLOCK_AGGREGATE';
      } catch (refreshError: unknown) {
        if (!this.isActive(callbacks, generation)) return 'STOP_QUEUE';
        return this.handleCommandError(command, refreshError, callbacks, generation);
      }
    }

    if (isTransient(error)) {
      const delay = Math.min(30_000, 1_000 * 2 ** Math.max(0, command.attempts - 1));
      const nextAttemptAt = new Date(Date.now() + delay).toISOString();
      const pending = await this.queue.markPending(
        command.clientMutationId,
        code || 'POS_SYNC_TRANSIENT_ERROR',
        nextAttemptAt
      );
      await this.notify(callbacks.commandChanged, pending);
      this.scheduleRetry(delay);
      return 'BLOCK_AGGREGATE';
    }

    const failed = await this.queue.markFailed(command.clientMutationId, code || 'POS_SYNC_COMMAND_REJECTED');
    await this.notify(callbacks.commandChanged, failed);
    await this.notify(callbacks.error, failed.lastErrorCode ?? 'POS_SYNC_COMMAND_REJECTED');
    return 'BLOCK_AGGREGATE';
  }

  private async drainOperationalChanges(
    callbacks: PosSyncCallbacks,
    generation: number,
    allowCursorReset = true
  ): Promise<void> {
    const device = await this.queue.getDevice();
    if (!device) {
      await this.notify(callbacks.error, 'POS_OFFLINE_DEVICE_NOT_FOUND');
      return;
    }

    let cursor = await this.queue.getSyncCursor();
    try {
      while (true) {
        this.assertActive(callbacks, generation);
        const page = await firstValueFrom(this.posService.getSync(device.deviceId, cursor ?? undefined));
        this.assertActive(callbacks, generation);
        if (page.changes.length > 0) await callbacks.applyOperationalChanges(page.changes);
        await this.queue.setSyncCursor(page.serverCursor);
        if (page.changes.length < 200) return;
        if (page.serverCursor === cursor) {
          await this.notify(callbacks.error, 'POS_SYNC_CURSOR_STALLED');
          return;
        }
        cursor = page.serverCursor;
      }
    } catch (error: unknown) {
      if (!this.isActive(callbacks, generation)) return;
      const code = errorCode(error);
      if (code === 'INVALID_SYNC_CURSOR' && allowCursorReset) {
        await this.queue.setSyncCursor(null);
        await this.drainOperationalChanges(callbacks, generation, false);
        return;
      }
      if (code === 'DEVICE_REVOKED') {
        await this.failEntireQueue(code, callbacks);
        await this.notify(callbacks.error, code);
        return;
      }
      await this.notify(callbacks.error, code || 'POS_SYNC_FAILED');
      if (isTransient(error)) this.scheduleRetry(1_000);
    }
  }

  private async failEntireQueue(errorCodeValue: string, callbacks: PosSyncCallbacks): Promise<void> {
    for (const command of await this.queue.listCommands()) {
      const failed = await this.queue.markFailed(command.clientMutationId, errorCodeValue);
      await this.notify(callbacks.commandChanged, failed);
    }
  }

  private scheduleRetry(delay: number): void {
    if (!this.callbacks || this.retryTimer) return;
    this.retryTimer = setTimeout(
      () => {
        this.retryTimer = null;
        const callbacks = this.callbacks;
        if (callbacks) void this.requestSync();
      },
      Math.max(0, Math.min(delay, 30_000))
    );
  }

  private isActive(callbacks: PosSyncCallbacks, generation: number): boolean {
    return this.callbacks === callbacks && this.generation === generation;
  }

  private assertActive(callbacks: PosSyncCallbacks, generation: number): void {
    if (!this.isActive(callbacks, generation)) throw new PosSyncCancelledError();
  }

  private async notify<TArgs extends unknown[]>(
    callback: ((...args: TArgs) => void | Promise<void>) | undefined,
    ...args: TArgs
  ): Promise<void> {
    try {
      await callback?.(...args);
    } catch {
      // UI callbacks must never change durable queue state.
    }
  }
}

class PosSyncCancelledError extends Error {}

class PosSyncCommandError extends Error {
  constructor(
    readonly code: string,
    readonly status: number
  ) {
    super(code);
  }
}

function errorCode(error: unknown): string | undefined {
  if (error instanceof PosSyncCommandError) return error.code;
  if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object')
    return undefined;
  const code = (error.error as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : undefined;
}

function isTransient(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return !(error instanceof PosSyncCommandError);
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported POS command: ${JSON.stringify(value)}`);
}
