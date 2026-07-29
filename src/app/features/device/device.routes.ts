import { Routes } from '@angular/router';

import { PosOfflineQueueService } from '../ventas/services/pos-offline-queue.service';
import { PosSessionStore } from '../ventas/services/pos-session.store';
import { PosSyncService } from '../ventas/services/pos-sync.service';
import { DeviceShellComponent } from './components/device-shell/device-shell.component';
import { deviceModeGuard } from './guards/device-mode.guard';
import { pairedDeviceGuard } from './guards/paired-device.guard';

const deviceRoutes: Routes = [
  {
    path: '',
    component: DeviceShellComponent,
    providers: [PosOfflineQueueService, PosSyncService, PosSessionStore],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/pairing/device-pairing.component').then((component) => component.DevicePairingComponent)
      },
      {
        path: 'cocina',
        canActivate: [pairedDeviceGuard, deviceModeGuard],
        data: { deviceMode: 'KDS' },
        loadComponent: () =>
          import('../ventas/pages/kitchen/kitchen-display.component').then(
            (component) => component.KitchenDisplayComponent
          )
      },
      {
        path: 'terminal',
        canActivate: [pairedDeviceGuard, deviceModeGuard],
        data: { deviceMode: 'REGISTER' },
        loadComponent: () =>
          import('../ventas/pages/terminal/pos-terminal.component').then((component) => component.PosTerminalComponent)
      },
      {
        path: 'revocado',
        loadComponent: () =>
          import('./pages/revoked/device-revoked.component').then((component) => component.DeviceRevokedComponent)
      },
      { path: '**', redirectTo: '' }
    ]
  }
];

export default deviceRoutes;
