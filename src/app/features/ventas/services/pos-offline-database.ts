import { InjectionToken } from '@angular/core';

export const POS_OFFLINE_DATABASE_NAME = 'maingoo-pos';
export const POS_OFFLINE_DATABASE_VERSION = 1;
export const POS_OFFLINE_STORE_NAMES = ['device', 'bootstrap', 'orders', 'commands'] as const;

export type PosOfflineStoreName = (typeof POS_OFFLINE_STORE_NAMES)[number];
export type PosOfflineTransactionMode = 'readonly' | 'readwrite';

export interface PosOfflineTransaction {
  get<T>(store: PosOfflineStoreName, key: IDBValidKey): Promise<T | undefined>;
  getAll<T>(store: PosOfflineStoreName): Promise<T[]>;
  put<T>(store: PosOfflineStoreName, value: T): Promise<void>;
  delete(store: PosOfflineStoreName, key: IDBValidKey): Promise<void>;
}

export interface PosOfflineDatabase {
  transaction<T>(
    stores: readonly PosOfflineStoreName[],
    mode: PosOfflineTransactionMode,
    work: (transaction: PosOfflineTransaction) => Promise<T>
  ): Promise<T>;
  close(): void;
}

export const POS_OFFLINE_DATABASE = new InjectionToken<PosOfflineDatabase>('POS_OFFLINE_DATABASE', {
  providedIn: 'root',
  factory: () => new NativePosOfflineDatabase()
});

class NativePosOfflineDatabase implements PosOfflineDatabase {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async transaction<T>(
    stores: readonly PosOfflineStoreName[],
    mode: PosOfflineTransactionMode,
    work: (transaction: PosOfflineTransaction) => Promise<T>
  ): Promise<T> {
    const database = await this.open();
    const transaction = database.transaction([...stores], mode);
    const completion = transactionCompletion(transaction);
    const wrapper: PosOfflineTransaction = {
      get: <TValue>(store: PosOfflineStoreName, key: IDBValidKey) =>
        requestResult<TValue | undefined>(transaction.objectStore(store).get(key)),
      getAll: <TValue>(store: PosOfflineStoreName) => requestResult<TValue[]>(transaction.objectStore(store).getAll()),
      put: <TValue>(store: PosOfflineStoreName, value: TValue) =>
        requestResult(transaction.objectStore(store).put(value)).then(() => undefined),
      delete: (store: PosOfflineStoreName, key: IDBValidKey) =>
        requestResult(transaction.objectStore(store).delete(key)).then(() => undefined)
    };

    try {
      const result = await work(wrapper);
      await completion;
      return result;
    } catch (error: unknown) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have aborted because of the original storage error.
      }
      await completion.catch(() => undefined);
      throw error;
    }
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = null;
  }

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('POS_OFFLINE_STORAGE_UNAVAILABLE'));
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(POS_OFFLINE_DATABASE_NAME, POS_OFFLINE_DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('device'))
          database.createObjectStore('device', { keyPath: 'enterpriseId' });
        if (!database.objectStoreNames.contains('bootstrap')) {
          database.createObjectStore('bootstrap', { keyPath: 'enterpriseId' });
        }
        if (!database.objectStoreNames.contains('orders')) {
          const orders = database.createObjectStore('orders', { keyPath: 'orderId' });
          orders.createIndex('enterpriseId', 'enterpriseId', { unique: false });
        }
        if (!database.objectStoreNames.contains('commands')) {
          const commands = database.createObjectStore('commands', { keyPath: 'clientMutationId' });
          commands.createIndex('enterpriseClientCreatedAt', ['enterpriseId', 'clientCreatedAt'], { unique: false });
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('POS_OFFLINE_STORAGE_FAILED'));
      request.onblocked = () => reject(new Error('POS_OFFLINE_STORAGE_BLOCKED'));
    }).catch((error: unknown) => {
      this.databasePromise = null;
      throw error;
    });

    return this.databasePromise;
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('POS_OFFLINE_STORAGE_FAILED'));
  });
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('POS_OFFLINE_STORAGE_FAILED'));
    transaction.onerror = () => reject(transaction.error ?? new Error('POS_OFFLINE_STORAGE_FAILED'));
  });
}
