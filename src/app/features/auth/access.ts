import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../layout/component/floating-configurator/app.floatingconfigurator';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-access',
  standalone: true,
  imports: [ButtonModule, RouterModule, RippleModule, AppFloatingConfigurator, ButtonModule, IconComponent],
  templateUrl: './access.html'
})
export class Access { }
