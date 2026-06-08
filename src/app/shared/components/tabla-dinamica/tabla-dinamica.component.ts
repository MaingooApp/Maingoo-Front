import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { InputIcon } from 'primeng/inputicon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Column } from '../../interfaces/columns.interface';
import { Action } from '../../interfaces/actions.interface';
import { IconComponent } from '../icon/icon.component';

export type TableRow = unknown;

@Component({
  selector: 'app-tabla-dinamica',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    IconFieldModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    FormsModule,
    TooltipModule,
    FormsModule,
    InputIcon,
    IconComponent
  ],
  templateUrl: './tabla-dinamica.component.html'
})
export class TablaDinamicaComponent {
  @ViewChild('dt') dt!: Table;
  @Input() data: TableRow[] = [];
  @Input() columns: readonly Column[] = [];
  @Input() actions: readonly Action[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No se encontraron resultados.';
  @Input() globalFilterFields: string[] = [];
  @Input() selection: TableRow[] = [];
  @Input() enableCheckbox: boolean = false;
  @Input() selectionMode: 'single' | 'multiple' = 'multiple';
  @Input() exportPdf: boolean = false;
  @Input() exportFilename: string = 'export';
  @Input() showRowIndex: boolean = false;

  @Output() selectionChange = new EventEmitter<TableRow[]>();

  @Output() actionClick = new EventEmitter<{ action: string; row: TableRow }>();

  onActionClick(action: string, row: TableRow) {
    this.actionClick.emit({ action, row });
  }

  getInputValue(event: Event): string {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    return input?.value ?? '';
  }

  convertToDecimal(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const sanitized = value.replace(',', '.');
      const parsed = parseFloat(sanitized);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  exportarComoPdf() {
    const doc = new jsPDF();

    const headers = this.columns.map((col) => col.header);
    const source = this.dt.filteredValue ?? this.data;

    const rows = source.map((row) =>
      this.columns.map((col) => {
        const value = this.getNestedValue(row, col.field);

        if (col.type === 'numeric') return this.convertToDecimal(value);
        if (col.type === 'date' && value instanceof Date) return value.toLocaleString();
        return value ?? '';
      })
    );

    autoTable(doc, {
      head: [headers],
      body: rows
    });

    doc.save(`${this.exportFilename}.pdf`);
  }

  getNestedValue(obj: TableRow, path: string): unknown {
    const value = path.split('.').reduce<unknown>((acc, part) => {
      if (typeof acc !== 'object' || acc === null) {
        return undefined;
      }

      return (acc as Record<string, unknown>)[part];
    }, obj);
    if (value === undefined || value === null) return '';
    return value;
  }

  getDateValue(obj: TableRow, path: string): string | number | Date | null {
    const value = this.getNestedValue(obj, path);
    return typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : null;
  }

  getFiltrados() {
    return this.dt.filteredValue ?? this.data;
  }
}
