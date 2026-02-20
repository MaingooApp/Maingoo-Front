import { Component, inject, OnDestroy, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentasSectionHeaderDetailComponent } from './components/ventas-section-header-detail/ventas-section-header-detail.component';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, VentasSectionHeaderDetailComponent],
  template: `
    <div class="flex flex-col gap-6 relative items-start min-h-screen p-6 -m-6">
      <div class="flex-1 w-full min-w-0 transition-all duration-300">
        <!-- GLOBAL HEADER TEMPLATE (Projected to Layout Shell) -->
        <ng-template #headerTpl>
          <app-ventas-section-header-detail></app-ventas-section-header-detail>
        </ng-template>

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
export class VentasComponent implements OnDestroy, AfterViewInit {
  private headerService = inject(SectionHeaderService);
  @ViewChild('headerTpl') headerTpl!: TemplateRef<any>;

  ngAfterViewInit() {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy() {
    this.headerService.reset();
  }
}
