import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-fiscal-section-header-detail',
  standalone: true,
  imports: [CommonModule, InputTextModule],
  templateUrl: './fiscal-section-header-detail.component.html'
})
export class FiscalSectionHeaderDetailComponent {
  @Output() search = new EventEmitter<Event>();

  onSearch(event: Event) {
    this.search.emit(event);
  }
}
