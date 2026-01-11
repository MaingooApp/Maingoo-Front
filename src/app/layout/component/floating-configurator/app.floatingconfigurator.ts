import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from '../configurator/app.configurator';
import { LayoutService } from '../../service/layout.service';

import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-floating-configurator',
  imports: [ButtonModule, StyleClassModule, AppConfigurator, IconComponent],
  templateUrl: './app.floatingconfigurator.html',
  styleUrls: ['./app.floatingconfigurator.scss']
})
export class AppFloatingConfigurator {
  LayoutService = inject(LayoutService);

  isDarkTheme = computed(() => this.LayoutService.layoutConfig().darkTheme);

  toggleDarkMode() {
    this.LayoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
  }
}
