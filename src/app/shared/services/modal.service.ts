import { Injectable, OnDestroy, Type } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

export interface TypedDialogConfig<TData = any> extends DynamicDialogConfig {
  data?: TData;
}

@Injectable({ providedIn: 'root' })
export class ModalService implements OnDestroy {
  private readonly defaultConfig: Partial<DynamicDialogConfig> = {
    modal: true,
    closable: true,
    dismissableMask: true,
    closeOnEscape: true,
    focusTrap: true,
    autoZIndex: true,
    baseZIndex: 1100,
    width: '480px'
  };

  private openRefs: Set<DynamicDialogRef> = new Set();

  constructor(private dialogService: DialogService) {}

  open<TComponent, TData = any>(component: Type<TComponent>, config?: TypedDialogConfig<TData>): DynamicDialogRef {
    const mergedConfig: DynamicDialogConfig = {
      ...this.defaultConfig,
      ...config
    };

    const ref = this.dialogService.open(component, mergedConfig);
    this.registerRef(ref);
    return ref;
  }

  close(ref: DynamicDialogRef | null | undefined): void {
    ref?.close();
  }

  closeAll(): void {
    this.openRefs.forEach((ref) => ref.close());
    this.openRefs.clear();
  }

  private registerRef(ref: DynamicDialogRef): void {
    this.openRefs.add(ref);

    const cleanup = () => this.openRefs.delete(ref);
    ref.onClose.subscribe(cleanup);
    ref.onDestroy?.subscribe(cleanup);
  }

  ngOnDestroy(): void {
    this.closeAll();
  }
}
