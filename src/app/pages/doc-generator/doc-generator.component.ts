import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { FluidModule } from 'primeng/fluid';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { ToastService } from '../../core/services/toast.service';

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
    id?: number;
    name: string;
    type: 'positive' | 'negative';
    lastTemp?: number;
    lastCheck?: Date;
}

interface Fryer {
    name: string;
    capacity: string;
}

interface DocumentCard {
    id: string;
    title: string;
    tags: string[];
    type: 'temperature' | 'oil' | 'payroll' | 'other';
}

@Component({
    selector: 'app-doc-generator',
    imports: [CommonModule, ButtonModule, InputTextModule, FormsModule, BadgeModule, MenuModule, CardModule, DialogModule, IconFieldModule, FluidModule, InputIconModule, ChipModule, DropdownModule],
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
        { id: 'oil', title: 'Cambios de Aceite', tags: ['APPCC'], type: 'oil' },
        { id: 'payroll', title: 'Nóminas', tags: ['RRHH'], type: 'payroll' }
    ];

    // Cameras list
    cameras: Camera[] = [];

    // Camera view modal
    displayCameraViewModal: boolean = false;
    selectedCamera: Camera | null = null;

    // Temperature registration modal
    displayTemperatureModal: boolean = false;
    newTemperature: number | null = null;
    temperatureObservations: string = '';

    // Camera edit modal
    displayCameraEditModal: boolean = false;
    editCameraData: Camera = {
        name: '',
        type: 'positive'
    };

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

    constructor(private toastService: ToastService) {}

    get filteredDocuments(): DocumentCard[] {
        let filtered = this.documentCards;

        // Filtrar por etiquetas seleccionadas
        if (this.selectedTagFilters.length > 0) {
            filtered = filtered.filter((doc) => this.selectedTagFilters.some((tag) => doc.tags.includes(tag)));
        }

        // Filtrar por búsqueda de texto
        if (this.documentSearchQuery.trim()) {
            const query = this.documentSearchQuery.toLowerCase();
            filtered = filtered.filter((doc) => doc.title.toLowerCase().includes(query) || doc.tags.some((tag) => tag.toLowerCase().includes(query)));
        }

        return filtered;
    }

    isDocumentVisible(docId: string): boolean {
        return this.filteredDocuments.some((doc) => doc.id === docId);
    }

    getTagColor(tag: string): string {
        const colors: { [key: string]: string } = {
            APPCC: 'bg-blue-100 text-blue-800 border-blue-300',
            Calidad: 'bg-green-100 text-green-800 border-green-300',
            Legal: 'bg-purple-100 text-purple-800 border-purple-300',
            RRHH: 'bg-orange-100 text-orange-800 border-orange-300'
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
        return this.quickFilters.some((f) => f.active);
    }

    openTemperatureModal() {
        this.toastService.info('Registro de Temperaturas', 'Abriendo formulario de registro...');
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
            this.toastService.warn('Atención', 'Por favor ingresa el nombre de la cámara');
            return;
        }

        const camera: Camera = {
            id: this.cameras.length + 1,
            name: this.newCamera.name,
            type: this.newCamera.type,
            lastTemp: undefined,
            lastCheck: undefined
        };

        this.cameras.push(camera);

        this.toastService.success('Cámara Añadida', `${camera.name} (${camera.type === 'positive' ? 'Frigorífico' : 'Congelador'}) añadida correctamente`);

        console.log('Cámaras actuales:', this.cameras);

        this.displayCameraModal = false;
    }

    cancelCameraModal() {
        this.displayCameraModal = false;
        this.newCamera = {
            name: '',
            type: 'positive'
        };
    }

    getCameraIcon(type: string): string {
        return type === 'positive' ? 'assets/icons/temperature-plus.svg' : 'assets/icons/temperature-minus.svg';
    }

    getCameraTypeLabel(type: string): string {
        return type === 'positive' ? 'Frigorífico' : 'Congelador';
    }

    openTemperatureRegistration(camera: Camera) {
        this.selectedCamera = camera;
        this.displayCameraViewModal = true;
    }

    openQuickTemperatureRegistration(camera: Camera) {
        this.selectedCamera = camera;
        this.newTemperature = null;
        this.temperatureObservations = '';
        this.displayTemperatureModal = true;
    }

    closeCameraViewModal() {
        this.displayCameraViewModal = false;
        this.selectedCamera = null;
    }

    registerTemperature() {
        if (!this.selectedCamera) return;

        this.newTemperature = null;
        this.temperatureObservations = '';
        this.displayTemperatureModal = true;
    }

    saveTemperatureRegistration() {
        if (!this.selectedCamera || this.newTemperature === null) {
            this.toastService.warn('Atención', 'Por favor ingresa una temperatura válida');
            return;
        }

        // Validar rangos según tipo de cámara
        const isValidTemp = this.validateTemperature(this.newTemperature, this.selectedCamera.type);

        if (!isValidTemp.valid) {
            this.toastService.warn('Temperatura Fuera de Rango', isValidTemp.message);
        }

        // Actualizar la cámara con la nueva temperatura
        this.selectedCamera.lastTemp = this.newTemperature;
        this.selectedCamera.lastCheck = new Date();

        // Actualizar en el array de cámaras
        const cameraIndex = this.cameras.findIndex((c) => c.id === this.selectedCamera!.id);
        if (cameraIndex > -1) {
            this.cameras[cameraIndex] = { ...this.selectedCamera };
        }

        this.toastService.success('Temperatura Registrada', `${this.newTemperature}°C registrados para ${this.selectedCamera.name}`);

        console.log('Temperatura registrada:', {
            camera: this.selectedCamera.name,
            temperature: this.newTemperature,
            observations: this.temperatureObservations,
            timestamp: new Date()
        });

        this.displayTemperatureModal = false;
    }

    cancelTemperatureRegistration() {
        this.displayTemperatureModal = false;
        this.newTemperature = null;
        this.temperatureObservations = '';
    }

    validateTemperature(temp: number, type: string): { valid: boolean; message: string } {
        if (type === 'positive') {
            // Frigorífico: rango ideal 0°C a 5°C
            if (temp < 0 || temp > 8) {
                return {
                    valid: false,
                    message: `Temperatura fuera del rango recomendado (0°C - 5°C). Valor actual: ${temp}°C`
                };
            }
        } else if (type === 'negative') {
            // Congelador: rango ideal -18°C a -22°C
            if (temp > -10 || temp < -30) {
                return {
                    valid: false,
                    message: `Temperatura fuera del rango recomendado (-18°C a -22°C). Valor actual: ${temp}°C`
                };
            }
        }

        return { valid: true, message: 'OK' };
    }

    editCamera() {
        if (!this.selectedCamera) return;

        // Copiar los datos de la cámara seleccionada al formulario de edición
        this.editCameraData = {
            id: this.selectedCamera.id,
            name: this.selectedCamera.name,
            type: this.selectedCamera.type,
            lastTemp: this.selectedCamera.lastTemp,
            lastCheck: this.selectedCamera.lastCheck
        };

        this.displayCameraEditModal = true;
    }

    saveCameraEdit() {
        if (!this.editCameraData.name.trim()) {
            this.toastService.warn('Atención', 'Por favor ingresa el nombre de la cámara');
            return;
        }

        // Actualizar la cámara en el array
        const cameraIndex = this.cameras.findIndex((c) => c.id === this.editCameraData.id);
        if (cameraIndex > -1) {
            this.cameras[cameraIndex] = { ...this.editCameraData };

            // Si es la cámara seleccionada actualmente, actualizar también
            if (this.selectedCamera && this.selectedCamera.id === this.editCameraData.id) {
                this.selectedCamera = { ...this.editCameraData };
            }
        }

        this.toastService.success('Cámara Actualizada', `${this.editCameraData.name} actualizada correctamente`);

        console.log('Cámara editada:', this.editCameraData);

        this.displayCameraEditModal = false;
    }

    cancelCameraEdit() {
        this.displayCameraEditModal = false;
        this.editCameraData = {
            name: '',
            type: 'positive'
        };
    }

    deleteCamera() {
        if (!this.selectedCamera) return;

        const cameraName = this.selectedCamera.name;
        this.cameras = this.cameras.filter((c) => c.id !== this.selectedCamera!.id);

        this.toastService.success('Cámara Eliminada', `${cameraName} ha sido eliminada`);

        this.closeCameraViewModal();
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
            this.toastService.warn('Atención', 'Por favor ingresa el nombre de la freidora');
            return;
        }

        this.toastService.success('Freidora Añadida', `${this.newFryer.name} añadida correctamente`);

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
        this.toastService.info('Búsqueda', `Buscando documentos: "${this.searchQuery}"`);
    }

    toggleFilter(filter: QuickFilter) {
        // Desactivar otros filtros
        this.quickFilters.forEach((f) => {
            if (f.id !== filter.id) {
                f.active = false;
            }
        });

        // Toggle el filtro seleccionado
        filter.active = !filter.active;

        console.log('Filtro activado:', filter.label, filter.active);

        if (filter.active) {
            this.toastService.info('Filtro Aplicado', `Mostrando: ${filter.label}`);
        }
    }

    clearFilters() {
        this.quickFilters.forEach((f) => (f.active = false));
        this.searchQuery = '';
        this.toastService.info('Filtros Eliminados', 'Mostrando todos los documentos');
    }

    uploadDocument() {
        this.toastService.success('Subir Documento', 'Abriendo selector de archivos...');
        // Aquí implementar la lógica de subida
    }

    createChecklist() {
        this.toastService.success('Crear Checklist', 'Abriendo formulario de checklist...');
        // Aquí implementar la lógica de creación
    }

    uploadPayroll() {
        this.toastService.info('Subir Nómina', 'Abriendo selector de archivos para nóminas...');
        // TODO: Implementar selector de archivos para nóminas
    }
}
