import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PosSessionStore } from '../../../ventas/services/pos-session.store';
import { DevicePairingService } from '../../services/device-pairing.service';
import { DeviceSessionService } from '../../services/device-session.service';

@Component({
  selector: 'app-device-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-surface-50 p-4 dark:bg-surface-950 md:p-6">
      <header class="mx-auto mb-4 flex max-w-screen-2xl items-center justify-between gap-4" aria-label="Maingoo TPV">
        <div class="flex items-center gap-3">
          <img src="assets/images/maingoo_logo.svg" alt="Maingoo" class="h-10 w-10 object-contain" />
          <span class="text-lg font-semibold mg-text">Maingoo TPV</span>
        </div>
        @if (session.device(); as device) {
          <div class="flex min-w-0 items-center gap-3 text-right">
            <div class="min-w-0">
              <p class="m-0 truncate text-sm font-semibold mg-text" [title]="device.name">{{ device.name }}</p>
              <p class="m-0 text-xs mg-text-muted">{{ device.type === 'KDS' ? 'Pantalla de cocina' : 'Terminal' }}</p>
              @if (session.operatorSession(); as operator) {
                <p class="m-0 truncate text-xs font-medium mg-text" data-testid="active-employee">
                  {{ operator.user.name }}
                </p>
              }
            </div>
            <span class="inline-flex items-center gap-2 text-sm mg-text-muted" role="status" aria-live="polite">
              <span
                class="h-2.5 w-2.5 rounded-full"
                [class.bg-green-500]="online()"
                [class.bg-red-500]="!online()"
                aria-hidden="true"></span>
              {{ online() ? 'Online' : 'Sin conexión' }}
            </span>
            @if (device.type === 'REGISTER' && session.operatorSession()) {
              <button
                type="button"
                class="min-h-11 rounded-lg border border-surface px-3 text-sm font-medium mg-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                [disabled]="employeeLogoutPending()"
                (click)="changeEmployee()">
                {{ employeeLogoutPending() ? 'Sincronizando…' : 'Bloquear / cambiar camarero' }}
              </button>
            }
          </div>
        }
      </header>
      @if (employeeLogoutErrorText(); as error) {
        <p
          class="mx-auto mb-4 max-w-screen-2xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          role="alert">
          {{ error }}
        </p>
      }
      <main class="mx-auto min-h-[calc(100vh-6.5rem)] max-w-screen-2xl rounded-content shadow-sm mg-surface">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceShellComponent {
  readonly session = inject(DeviceSessionService);
  private readonly pairing = inject(DevicePairingService);
  private readonly posStore = inject(PosSessionStore);
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly employeeLogoutPending = signal(false);
  readonly employeeLogoutErrorCode = signal<string | null>(null);

  readonly employeeLogoutErrorText = () => {
    switch (this.employeeLogoutErrorCode()) {
      case 'EMPLOYEE_LOGOUT_OFFLINE':
        return 'Conéctate para bloquear o cambiar de camarero.';
      case 'EMPLOYEE_LOGOUT_SYNC_REQUIRED':
        return 'No se puede cambiar de camarero hasta sincronizar todas las operaciones pendientes.';
      case 'EMPLOYEE_LOGOUT_FAILED':
        return 'No se pudo cerrar la sesión del camarero. Inténtalo de nuevo.';
      default:
        return this.employeeLogoutErrorCode();
    }
  };

  async changeEmployee(): Promise<void> {
    if (!this.session.operatorSession() || this.employeeLogoutPending()) return;
    this.employeeLogoutErrorCode.set(null);
    if (!this.online()) {
      this.employeeLogoutErrorCode.set('EMPLOYEE_LOGOUT_OFFLINE');
      return;
    }

    this.employeeLogoutPending.set(true);
    try {
      if (this.posStore.pendingCommandCount() > 0) {
        await this.posStore.syncNow();
        if (this.posStore.pendingCommandCount() > 0) {
          this.employeeLogoutErrorCode.set('EMPLOYEE_LOGOUT_SYNC_REQUIRED');
          return;
        }
      }
      await firstValueFrom(this.pairing.logoutEmployeeSession());
      await this.session.clearOperatorSession();
    } catch (error: unknown) {
      this.employeeLogoutErrorCode.set(errorCode(error));
    } finally {
      this.employeeLogoutPending.set(false);
    }
  }

  @HostListener('window:online')
  setOnline(): void {
    this.online.set(true);
  }

  @HostListener('window:offline')
  setOffline(): void {
    this.online.set(false);
  }
}

function errorCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.error === null || typeof error.error !== 'object') {
    return 'EMPLOYEE_LOGOUT_FAILED';
  }
  const code = (error.error as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : 'EMPLOYEE_LOGOUT_FAILED';
}
