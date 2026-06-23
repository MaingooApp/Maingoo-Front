import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-rrhh-section-header-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, IconComponent],
  templateUrl: './rrhh-section-header-detail.component.html'
})
export class RrhhSectionHeaderDetailComponent {
  @Output() search = new EventEmitter<Event>();
  @Output() addEmployee = new EventEmitter<void>();

  onSearch(event: Event) {
    this.search.emit(event);
  }

  onAddEmployee() {
    this.addEmployee.emit();
  }
}
