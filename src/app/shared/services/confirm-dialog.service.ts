import { Injectable } from '@angular/core';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { ConfirmDialogOptions } from '../interfaces/confirm-dialog-options.interface';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly baseConfig: Confirmation = {
    header: 'Confirmar acción',
    icon: 'pi pi-question-circle',
    acceptLabel: 'Aceptar',
    rejectLabel: 'Cancelar',
    rejectButtonStyleClass: 'p-button-text'
  };

  constructor(private confirmationService: ConfirmationService) {}

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const {
        onAccept,
        onReject,
        ...rest
      } = options;
      const config: Confirmation = {
        ...this.baseConfig,
        ...rest,
        accept: () => {
          resolve(true);
          onAccept?.();
        },
        reject: () => {
          resolve(false);
          onReject?.();
        }
      };

      this.confirmationService.confirm(config);
    });
  }

  confirmDeletion(message: string, options?: Partial<ConfirmDialogOptions>): Promise<boolean> {
    return this.confirm({
      message,
      header: options?.header ?? 'Confirmar eliminación',
      icon: options?.icon ?? 'pi pi-exclamation-triangle',
      acceptLabel: options?.acceptLabel ?? 'Sí, eliminar',
      rejectLabel: options?.rejectLabel ?? 'Cancelar',
      acceptButtonStyleClass: options?.acceptButtonStyleClass ?? 'p-button-danger',
      rejectButtonStyleClass: options?.rejectButtonStyleClass ?? 'p-button-text',
      ...options
    });
  }
}
