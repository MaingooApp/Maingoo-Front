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
    InputIcon
  ],
  templateUrl: './tabla-dinamica.component.html'
})
export class TablaDinamicaComponent {
  @ViewChild('dt') dt!: Table;
  @Input() data: any[] = [];
  @Input() columns: readonly {
    field: string;
    header: string;
    type?: 'boolean' | 'text' | 'numeric' | 'date' | 'list';
    filter?: boolean;
  }[] = [];
  @Input() actions: readonly {
    icon: string;
    tooltip?: string;
    color?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
    action: string;
  }[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No se encontraron resultados.';
  @Input() globalFilterFields: string[] = [];
  @Input() selection: any[] = [];
  @Input() enableCheckbox: boolean = false;
  @Input() selectionMode: 'single' | 'multiple' = 'multiple';
  @Input() exportPdf: boolean = false;
  @Input() exportFilename: string = 'export';
  @Input() showRowIndex: boolean = false;

  @Output() selectionChange = new EventEmitter<any[]>();

  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();


  onActionClick(action: string, row: any) {
    this.actionClick.emit({ action, row });
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  convertToDecimal(value: any): number {
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
  
    const headers = this.columns.map(col => col.header);
    const source = this.dt.filteredValue ?? this.data;
  
    const rows = source.map(row =>
      this.columns.map(col => {
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

  getNestedValue(obj: any, path: string): any {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (value === undefined || value === null) return '';
    return value;
  }

  getFiltrados() {
    return this.dt.filteredValue ?? this.data;
  }
}