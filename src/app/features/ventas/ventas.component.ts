import { AfterViewInit, Component, inject, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentasSectionHeaderDetailComponent } from './components/ventas-section-header-detail/ventas-section-header-detail.component';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, TranslateModule, VentasSectionHeaderDetailComponent],
  template: `
    <div class="flex flex-col gap-6 relative items-start min-h-screen p-6 -m-6">
      <div class="flex-1 w-full min-w-0 transition-all duration-300">
        <ng-template #headerTpl>
          <app-ventas-section-header-detail [titleKey]="titleKey"></app-ventas-section-header-detail>
        </ng-template>

        <app-empty-state
          class="w-full"
          icon="payments"
          [title]="titleKey | translate"
          [description]="'pos.navigation.pendingDescription' | translate">
        </app-empty-state>
      </div>
    </div>
  `
})
export class VentasComponent implements OnDestroy, AfterViewInit {
  private headerService = inject(SectionHeaderService);
  readonly titleKey = inject(ActivatedRoute).snapshot.data['titleKey'] as string;

  @ViewChild('headerTpl') headerTpl!: TemplateRef<unknown>;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy(): void {
    this.headerService.reset();
  }
}
