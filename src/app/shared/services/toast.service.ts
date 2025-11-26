import { Injectable } from '@angular/core';
import { MessageService, ToastMessageOptions } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ToastService {
    private readonly defaultLife = 3000;

    constructor(private messageService: MessageService) {}

    show(options: ToastMessageOptions): void {
        this.messageService.add({
            ...options,
            life: options.life ?? this.defaultLife
        });
    }

    success(summary: string, detail?: string, life?: number): void {
        this.show({ severity: 'success', summary, detail, life });
    }

    info(summary: string, detail?: string, life?: number): void {
        this.show({ severity: 'info', summary, detail, life });
    }

    warn(summary: string, detail?: string, life?: number): void {
        this.show({ severity: 'warn', summary, detail, life });
    }

    error(summary: string, detail?: string, life?: number): void {
        this.show({ severity: 'error', summary, detail, life });
    }

    clear(key?: string): void {
        this.messageService.clear(key);
    }
}
