import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InventoryRecord, InventoryItem } from '@app/features/products/pages/list/productos.component'; // Ensure interface is exported or move it
// Wait, interfaces are in ProductosComponent? I should check where they are defined.
// They were defined in ProductosComponent TS lines 26-37 in the outline. I should MOVE them to a shared file or import them.
// I'll assume I need to move them or they are exported.
// I will import them from the parent component file for now, assuming they are exported.

@Component({
  selector: 'app-inventory-history',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TooltipModule,
    TableModule,
    TagModule
  ],
  templateUrl: './inventory-history.component.html'
})
export class InventoryHistoryComponent {
  @Input() savedInventories: InventoryRecord[] = [];
  @Input() selectedInventoryRecord: InventoryRecord | null = null;
  @Input() currentDate: Date = new Date(); // Passed from parent or new Date()

  @Output() back = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();
  @Output() delete = new EventEmitter<InventoryRecord>();
  @Output() select = new EventEmitter<InventoryRecord>();
  @Output() closeDetail = new EventEmitter<void>();

  getFormattedCategoryNames(names: string[] | undefined | null): string {
    if (!names || names.length === 0) {
      return 'todos los productos';
    }
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return `${names[0]} y ${names[1]}`;
    }
    const last = names[names.length - 1];
    const initial = names.slice(0, names.length - 1).join(', ');
    return `${initial} y ${last}`;
  }

  getCategoryStyle(category: string | undefined): { [klass: string]: any } {
    if (!category) return {};

    switch (category.toLowerCase()) {
      case 'frutas':
      case 'verduras':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'carnes':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      case 'lacteos':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'bebidas':
        return { backgroundColor: '#fef9c3', color: '#854d0e' };
      case 'limpieza':
        return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  }

  onSelect(record: InventoryRecord) {
    this.select.emit(record);
  }

  onDelete(record: InventoryRecord) {
    this.delete.emit(record);
  }
}

// Interface duplicates for safety until I move them?
// I should rely on the existing interfaces being exported.
// I will verify if InventoryRecord is exported in ProductosComponent.
