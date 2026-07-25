import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-ventas-section-header-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ventas-section-header-detail.component.html'
})
export class VentasSectionHeaderDetailComponent {
  readonly titleKey = input.required<string>();
}
