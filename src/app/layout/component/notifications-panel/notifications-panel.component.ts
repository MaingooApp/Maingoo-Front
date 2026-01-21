import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * NotificationsPanelComponent
 * 
 * Este componente ha sido migrado a sidebar-notifications.
 * Las notificaciones ahora se muestran dentro del sidebar integrado.
 * 
 * Se mantiene vacío para no romper referencias existentes.
 */
@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-panel.component.html'
})
export class NotificationsPanelComponent { }
