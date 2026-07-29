import { Injectable, InjectionToken, inject } from '@angular/core';

import { DeviceSessionKey, DeviceSessionSnapshot, DeviceSessionValues } from '../models/device-session.models';

export const DEVICE_SESSION_DATABASE_NAME = 'maingoo-pos-device-session';
export const DEVICE_SESSION_DATABASE_VERSION = 1;
export const DEVICE_SESSION_STORE_NAME = 'session';

export type DeviceSessionStorageErrorCode =
  | 'DEVICE_SESSION_STORAGE_UNAVAILABLE'
  | 'DEVICE_SESSION_STORAGE_BLOCKED'
  | 'DEVICE_SESSION_STORAGE_QUOTA_EXCEEDED'
  | 'DEVICE_SESSION_STORAGE_FAILED';

export class DeviceSessionStorageError extends Error {
  constructor(
    readonly code: DeviceSessionStorageErrorCode,
    options?: ErrorOptions
  ) {
    super(code, options);
    this.name = 'DeviceSessionStorageError';
  }
}

export interface DeviceSessionDatabase {
  initialize(): Promise<void>;
  get<TKey extends DeviceSessionKey>(key: TKey): Promise<DeviceSessionValues[TKey] | undefined>;
  put<TKey extends DeviceSessionKey>(key: TKey, value: DeviceSessionValues[TKey]): Promise<void>;
  delete(key: DeviceSessionKey): Promise<void>;
  clear(): Promise<void>;
}

export const DEVICE_SESSION_DATABASE = new InjectionToken<DeviceSessionDatabase>('DEVICE_SESSION_DATABASE', {
  providedIn: 'root',
  factory: () => new NativeDeviceSessionDatabase()
});

@Injectable({ providedIn: 'root' })
export class DeviceSessionStorageService {
  private readonly database = inject(DEVICE_SESSION_DATABASE);

  initialize(): Promise<void> {
    return this.run(() => this.database.initialize());
  }

  async load(): Promise<DeviceSessionSnapshot> {
    const pairedIdentity = await this.run(() => this.database.get('pairedIdentity'));
    if (pairedIdentity && isExpired(pairedIdentity.expiresAt)) {
      await this.clear();
      return { pairedIdentity: null, operatorSession: null, pendingPairing: null };
    }
    const [operatorSession, pendingPairing] = await Promise.all([
      this.get('operatorSession'),
      this.get('pendingPairing')
    ]);
    return { pairedIdentity: pairedIdentity ?? null, operatorSession, pendingPairing };
  }

  async get<TKey extends DeviceSessionKey>(key: TKey): Promise<DeviceSessionValues[TKey] | null> {
    const value = await this.run(() => this.database.get(key));
    if (!value) return null;
    if (!isExpired(value.expiresAt)) return value;

    await this.remove(key);
    return null;
  }

  save<TKey extends DeviceSessionKey>(key: TKey, value: DeviceSessionValues[TKey]): Promise<void> {
    return this.run(() => this.database.put(key, value));
  }

  remove(key: DeviceSessionKey): Promise<void> {
    return this.run(() => this.database.delete(key));
  }

  clear(): Promise<void> {
    return this.run(() => this.database.clear());
  }

  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error: unknown) {
      if (error instanceof DeviceSessionStorageError) throw error;
      if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new DeviceSessionStorageError('DEVICE_SESSION_STORAGE_QUOTA_EXCEEDED', { cause: error });
      }
      if (error instanceof Error && isStorageErrorCode(error.message)) {
        throw new DeviceSessionStorageError(error.message, { cause: error });
      }
      throw new DeviceSessionStorageError('DEVICE_SESSION_STORAGE_FAILED', { cause: error });
    }
  }
}

interface DeviceSessionRecord<TKey extends DeviceSessionKey = DeviceSessionKey> {
  key: TKey;
  value: DeviceSessionValues[TKey];
}

class NativeDeviceSessionDatabase implements DeviceSessionDatabase {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async initialize(): Promise<void> {
    await this.open();
  }

  async get<TKey extends DeviceSessionKey>(key: TKey): Promise<DeviceSessionValues[TKey] | undefined> {
    const record = await this.request<DeviceSessionRecord<TKey> | undefined>('readonly', (store) => store.get(key));
    return record?.value;
  }

  async put<TKey extends DeviceSessionKey>(key: TKey, value: DeviceSessionValues[TKey]): Promise<void> {
    await this.request('readwrite', (store) => store.put({ key, value }));
  }

  async delete(key: DeviceSessionKey): Promise<void> {
    await this.request('readwrite', (store) => store.delete(key));
  }

  async clear(): Promise<void> {
    await this.request('readwrite', (store) => store.clear());
  }

  private async request<T>(
    mode: IDBTransactionMode,
    createRequest: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const database = await this.open();
    const transaction = database.transaction(DEVICE_SESSION_STORE_NAME, mode);
    const completion = transactionCompletion(transaction);
    const request = createRequest(transaction.objectStore(DEVICE_SESSION_STORE_NAME));
    const result = await requestResult(request);
    await completion;
    return result;
  }

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('DEVICE_SESSION_STORAGE_UNAVAILABLE'));
    }
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DEVICE_SESSION_DATABASE_NAME, DEVICE_SESSION_DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DEVICE_SESSION_STORE_NAME)) {
          request.result.createObjectStore(DEVICE_SESSION_STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('DEVICE_SESSION_STORAGE_FAILED'));
      request.onblocked = () => reject(new Error('DEVICE_SESSION_STORAGE_BLOCKED'));
    }).catch((error: unknown) => {
      this.databasePromise = null;
      throw error;
    });

    return this.databasePromise;
  }
}

function isExpired(expiresAt: string): boolean {
  const expiry = Date.parse(expiresAt);
  return !Number.isFinite(expiry) || expiry <= Date.now();
}

function isStorageErrorCode(value: string): value is DeviceSessionStorageErrorCode {
  return [
    'DEVICE_SESSION_STORAGE_UNAVAILABLE',
    'DEVICE_SESSION_STORAGE_BLOCKED',
    'DEVICE_SESSION_STORAGE_QUOTA_EXCEEDED',
    'DEVICE_SESSION_STORAGE_FAILED'
  ].includes(value);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('DEVICE_SESSION_STORAGE_FAILED'));
  });
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('DEVICE_SESSION_STORAGE_FAILED'));
    transaction.onerror = () => reject(transaction.error ?? new Error('DEVICE_SESSION_STORAGE_FAILED'));
  });
}
