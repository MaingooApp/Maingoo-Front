import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * TopbarLeftWelcomeComponent
 *
 * Componente que muestra la sección izquierda del topbar:
 * - Logotipo de Maingoo (siempre visible)
 * - Mensaje de bienvenida con nombre de usuario y negocio
 */
@Component({
  selector: 'app-topbar-left-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar-left-welcome.component.html'
})
export class TopbarLeftWelcomeComponent {
  /** Nombre del usuario autenticado */
  @Input() userName: string | undefined;

  /** Nombre del negocio/empresa */
  @Input() businessName: string = 'Tu Negocio';

  /** Tipo de negocio (Restaurante, Catering, etc.) */
  @Input() businessType: string = '';
}
