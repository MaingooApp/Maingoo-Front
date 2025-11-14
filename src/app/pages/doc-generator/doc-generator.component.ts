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
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';

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

interface Camera {
  name: string;
  type: 'positive' | 'negative';
}

interface Fryer {
  name: string;
  capacity: string;
}

interface DocumentCard {
  id: string;
  title: string;
  tags: string[];
  type: 'temperature' | 'oil' | 'other';
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
    CardModule,
    DialogModule,
    DropdownModule
  ],
  providers: [MessageService],
  templateUrl: './doc-generator.component.html',
  styleUrl: './doc-generator.component.scss'
})
export class DocGeneratorComponent {
  searchQuery: string = '';
  documentSearchQuery: string = '';
  selectedTagFilters: string[] = [];
  
  availableTags = [
    { name: 'APPCC', color: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200' },
    { name: 'RRHH', color: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200' }
  ];
  
  documentCards: DocumentCard[] = [
    { id: 'temperatures', title: 'Registro Temperaturas', tags: ['APPCC'], type: 'temperature' },
    { id: 'oil', title: 'Cambios de Aceite', tags: ['APPCC'], type: 'oil' }
  ];
  
  // Camera modal
  displayCameraModal: boolean = false;
  newCamera: Camera = {
    name: '',
    type: 'positive'
  };
  
  cameraTypes = [
    { label: 'Frío Positivo (Frigorífico)', value: 'positive', icon: 'assets/icons/temperature-plus.svg' },
    { label: 'Frío Negativo (Congelador)', value: 'negative', icon: 'assets/icons/temperature-minus.svg' }
  ];

  // Fryer modal
  displayFryerModal: boolean = false;
  newFryer: Fryer = {
    name: '',
    capacity: ''
  };
  
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

  get filteredDocuments(): DocumentCard[] {
    let filtered = this.documentCards;
    
    // Filtrar por etiquetas seleccionadas
    if (this.selectedTagFilters.length > 0) {
      filtered = filtered.filter(doc => 
        this.selectedTagFilters.some(tag => doc.tags.includes(tag))
      );
    }
    
    // Filtrar por búsqueda de texto
    if (this.documentSearchQuery.trim()) {
      const query = this.documentSearchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }

  isDocumentVisible(docId: string): boolean {
    return this.filteredDocuments.some(doc => doc.id === docId);
  }

  getTagColor(tag: string): string {
    const colors: { [key: string]: string } = {
      'APPCC': 'bg-blue-100 text-blue-800 border-blue-300',
      'Calidad': 'bg-green-100 text-green-800 border-green-300',
      'Legal': 'bg-purple-100 text-purple-800 border-purple-300',
      'RRHH': 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[tag] || 'bg-gray-100 text-gray-800 border-gray-300';
  }

  onDocumentSearch() {
    console.log('Buscando documentos:', this.documentSearchQuery);
  }

  toggleTagFilter(tagName: string) {
    const index = this.selectedTagFilters.indexOf(tagName);
    if (index > -1) {
      this.selectedTagFilters.splice(index, 1);
    } else {
      this.selectedTagFilters.push(tagName);
    }
  }

  isTagFilterActive(tagName: string): boolean {
    return this.selectedTagFilters.includes(tagName);
  }

  clearAllFilters() {
    this.selectedTagFilters = [];
    this.documentSearchQuery = '';
  }

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
    this.displayCameraModal = true;
    this.newCamera = {
      name: '',
      type: 'positive'
    };
  }

  saveCameraModal() {
    if (!this.newCamera.name.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Por favor ingresa el nombre de la cámara'
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Cámara Añadida',
      detail: `${this.newCamera.name} (${this.newCamera.type === 'positive' ? 'Frigorífico' : 'Congelador'}) añadida correctamente`
    });
    
    console.log('Nueva cámara:', this.newCamera);
    // TODO: Guardar cámara en el servicio/backend
    
    this.displayCameraModal = false;
  }

  cancelCameraModal() {
    this.displayCameraModal = false;
    this.newCamera = {
      name: '',
      type: 'positive'
    };
  }

  addNewFryer() {
    this.displayFryerModal = true;
    this.newFryer = {
      name: '',
      capacity: ''
    };
  }

  saveFryerModal() {
    if (!this.newFryer.name.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Por favor ingresa el nombre de la freidora'
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Freidora Añadida',
      detail: `${this.newFryer.name} añadida correctamente`
    });
    
    console.log('Nueva freidora:', this.newFryer);
    // TODO: Guardar freidora en el servicio/backend
    
    this.displayFryerModal = false;
  }

  cancelFryerModal() {
    this.displayFryerModal = false;
    this.newFryer = {
      name: '',
      capacity: ''
    };
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
