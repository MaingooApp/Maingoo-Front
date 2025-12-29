import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './dashboard.component.html'
})
export class Dashboard {

}
