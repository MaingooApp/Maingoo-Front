import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, map, merge } from 'rxjs';

@Injectable()
export class InventoryConnectivityService {
  private readonly destroyRef = inject(DestroyRef);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);

  constructor() {
    if (typeof window === 'undefined') return;

    merge(fromEvent(window, 'online').pipe(map(() => true)), fromEvent(window, 'offline').pipe(map(() => false)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((online) => this.online.set(online));
  }
}
