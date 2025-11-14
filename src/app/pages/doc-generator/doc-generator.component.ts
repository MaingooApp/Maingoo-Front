import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { CardModule } from 'primeng/card';

interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  count: number;
  active: boolean;
  color: 'success' | 'info' | 'danger' | 'secondary';
}

interface TemperatureRecord {
  id: number;
  cameraName: string;
  temperature: number;
  timestamp: Date;
  status: 'ok' | 'warning' | 'critical';
}

@Component({
  selector: 'app-doc-generator',
  imports: [
    CommonModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    ToastModule,
    BadgeModule,
    MenuModule,
    CardModule
  ],
  providers: [MessageService],
  templateUrl: './doc-generator.component.html',
  styleUrl: './doc-generator.component.scss'
})
export class DocGeneratorComponent {
  searchQuery: string = '';
  
  quickFilters: QuickFilter[] = [
    {
      id: 'expiring',
      label: 'Caduca Pronto',
      icon: 'pi pi-exclamation-triangle',
      count: 5,
      active: false,
      color: 'danger'
    },
    {
      id: 'pending',
      label: 'Pendiente de Aprobación',
      icon: 'pi pi-clock',
      count: 3,
      active: false,
      color: 'info'
    },
    {
      id: 'recent',
      label: 'Recientes',
      icon: 'pi pi-history',
      count: 12,
      active: false,
      color: 'success'
    }
  ];

  newDocumentItems: MenuItem[] = [
    {
      label: 'Subir Documento',
      icon: 'pi pi-upload',
      command: () => this.uploadDocument()
    },
    {
      separator: true
    },
    {
      label: 'Crear Checklist',
      icon: 'pi pi-check-square',
      command: () => this.createChecklist()
    }
  ];

  constructor(private messageService: MessageService) {}

  hasActiveFilters(): boolean {
    return this.quickFilters.some(f => f.active);
  }

  openTemperatureModal() {
    this.messageService.add({
      severity: 'info',
      summary: 'Registro de Temperaturas',
      detail: 'Abriendo formulario de registro...'
    });
    // TODO: Implementar modal
  }

  addNewCamera() {
    this.messageService.add({
      severity: 'success',
      summary: 'Nueva Cámara',
      detail: 'Abriendo formulario para añadir cámara frigorífica...'
    });
    // TODO: Implementar modal para añadir cámara
  }

  onSearch() {
    console.log('Buscando:', this.searchQuery);
    this.messageService.add({
      severity: 'info',
      summary: 'Búsqueda',
      detail: `Buscando documentos: "${this.searchQuery}"`
    });
  }

  toggleFilter(filter: QuickFilter) {
    // Desactivar otros filtros
    this.quickFilters.forEach(f => {
      if (f.id !== filter.id) {
        f.active = false;
      }
    });
    
    // Toggle el filtro seleccionado
    filter.active = !filter.active;
    
    console.log('Filtro activado:', filter.label, filter.active);
    
    if (filter.active) {
      this.messageService.add({
        severity: 'info',
        summary: 'Filtro Aplicado',
        detail: `Mostrando: ${filter.label}`
      });
    }
  }

  clearFilters() {
    this.quickFilters.forEach(f => f.active = false);
    this.searchQuery = '';
    this.messageService.add({
      severity: 'info',
      summary: 'Filtros Eliminados',
      detail: 'Mostrando todos los documentos'
    });
  }

  uploadDocument() {
    this.messageService.add({
      severity: 'success',
      summary: 'Subir Documento',
      detail: 'Abriendo selector de archivos...'
    });
    // Aquí implementar la lógica de subida
  }

  createChecklist() {
    this.messageService.add({
      severity: 'success',
      summary: 'Crear Checklist',
      detail: 'Abriendo formulario de checklist...'
    });
    // Aquí implementar la lógica de creación
  }
}
