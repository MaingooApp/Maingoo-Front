import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-inventory-placeholder',
  standalone: true,
  imports: [EmptyStateComponent, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex min-h-full flex-col gap-6">
      <h1 class="m-0 text-2xl font-bold mg-text">{{ 'inventory.navigation.summary' | translate }}</h1>
      <app-empty-state
        icon="warehouse"
        [title]="'inventory.navigation.inventory' | translate"
        [description]="'inventory.navigation.pendingDescription' | translate" />
    </section>
  `
})
export class InventoryPlaceholderComponent {}
