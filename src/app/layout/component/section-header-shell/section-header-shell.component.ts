import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderService } from '../../service/section-header.service';

/**
 * Shell component for the global Section Header.
 * FIXED in the layout, below the topbar.
 * Contains the card styling (bg-white, rounded, shadow).
 * Content is provided by the active feature via SectionHeaderService.
 */
@Component({
  selector: 'app-section-header-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-header-shell.component.html'
})
export class SectionHeaderShellComponent {
  service = inject(SectionHeaderService);
}

