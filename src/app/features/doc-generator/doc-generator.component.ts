import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-doc-generator',
  imports: [
    CommonModule,
    SectionHeaderComponent
  ],
  templateUrl: './doc-generator.component.html'
})
export class DocGeneratorComponent {

  constructor(private toastService: ToastService) { }

  onHeaderSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    console.log('Search:', input.value);
    // Placeholder for future logic
  }
}
