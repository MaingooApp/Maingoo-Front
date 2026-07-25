import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';

import { PosDevice } from '../../models/pos.models';
import { PosSessionStore } from '../../services/pos-session.store';
import { PosService } from '../../services/pos.service';
import { AppPermission } from '@core/constants/permissions.enum';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

// ponytail: F1 stores only the non-secret device ID; F5 migrates it to the tenant-scoped IndexedDB store.
const DEVICE_STORAGE_KEY = 'maingoo-pos-device-id';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [ButtonModule, FormsModule, RouterLink, SkeletonComponent, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-terminal.component.html'
})
export class PosTerminalComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly posService = inject(PosService);
  private readonly permissions = inject(NgxPermissionsService);

  readonly store = inject(PosSessionStore);
  readonly devices = signal<PosDevice[]>([]);
  readonly loadingDevices = signal(false);
  readonly deviceListError = signal(false);
  readonly selectedDeviceId = signal('');
  readonly canManageDevices = !!this.permissions.getPermission(AppPermission.PosManage);

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.loadingDevices.set(true);
    this.deviceListError.set(false);
    this.posService
      .listDevices({ type: 'REGISTER', status: 'ACTIVE' })
      .pipe(
        finalize(() => this.loadingDevices.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (devices) => {
          this.devices.set(devices);
          const savedDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
          if (savedDeviceId && devices.some(({ id }) => id === savedDeviceId)) {
            this.selectedDeviceId.set(savedDeviceId);
            void this.store.load(savedDeviceId);
          } else if (savedDeviceId) {
            localStorage.removeItem(DEVICE_STORAGE_KEY);
          }
        },
        error: () => this.deviceListError.set(true)
      });
  }

  activateDevice(): void {
    const deviceId = this.selectedDeviceId();
    if (!deviceId) return;

    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    void this.store.load(deviceId);
  }

  changeDevice(): void {
    localStorage.removeItem(DEVICE_STORAGE_KEY);
    this.selectedDeviceId.set('');
    this.store.reset();
  }
}
