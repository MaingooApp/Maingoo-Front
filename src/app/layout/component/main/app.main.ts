import { Component, Input } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { SectionHeaderShellComponent } from '../section-header-shell/section-header-shell.component';

type NgClassValue = string | string[] | Set<string> | { [klass: string]: unknown } | null | undefined;

/**
 * AppMain — Contenedor principal del layout.
 *
 * Se posiciona debajo del Topbar y se adapta al Sidebar
 * mediante margin-right controlado por CSS (_responsive.scss).
 *
 * Usa --topbar-height (CSS variable) para calcular su posición y altura.
 */
@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, SectionHeaderShellComponent],
  templateUrl: './app.main.html'
})
export class AppMain {
  /** Clases dinámicas pasadas desde AppLayout (ngClass compatible) */
  @Input() containerClass: NgClass['ngClass'] | NgClassValue;
}
