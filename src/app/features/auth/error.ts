import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../layout/component/floating-configurator/app.floatingconfigurator';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-error',
  imports: [ButtonModule, RippleModule, RouterModule, AppFloatingConfigurator, ButtonModule, IconComponent],
  standalone: true,
  templateUrl: './error.html'
})
export class Error { }
