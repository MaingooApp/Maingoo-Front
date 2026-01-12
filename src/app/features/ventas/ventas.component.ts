import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, EmptyStateComponent],
  template: `
    <div class="flex flex-col gap-6 relative items-start min-h-screen p-6 -m-6">
      <div class="flex-1 w-full min-w-0 transition-all duration-300">
        <app-section-header class="w-full" title="Ventas" [showViewSwitcher]="false" [showSearch]="false">
        </app-section-header>

        <!-- Empty State -->
        <app-empty-state class="w-full" icon="payments"
          title="Sección en construcción"
          description="Estamos trabajando en esta funcionalidad. Pronto podrás gestionar tu TPV y tus precios de venta."
          [showComingSoon]="true">
        </app-empty-state>
      </div>
    </div>
  `
})
export class VentasComponent { }
