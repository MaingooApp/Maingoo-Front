import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { SupplierService, Supplier } from '../../core/services/supplier.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TablaDinamicaComponent } from '../../shared/components/tabla-dinamica/tabla-dinamica.component';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    imports: [CommonModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ButtonModule, TablaDinamicaComponent],
    templateUrl: './supplier.component.html'
})
export class SupplierComponent {
    private supplierService = inject(SupplierService);

    supplier: Supplier[] = [];
    cargando = false;

    columns = [
        { field: 'name', header: 'Nombre', type: 'text', filter: true },
        { field: 'taxId', header: 'NIF/CIF', type: 'text', filter: true },
        { field: 'address', header: 'Dirección', type: 'text', filter: true },
        { field: 'phone', header: 'Teléfono', type: 'text', filter: true },
        { field: 'email', header: 'Email', type: 'text', filter: true }
    ] as const;

    actions = [
        {
            icon: 'pi pi-trash',
            action: 'eliminar',
            color: 'danger',
            tooltip: 'Eliminar'
        }
    ] as const;

    constructor(
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    async ngOnInit() {
        this.cargando = true;
        this.supplierService.listSuppliers().subscribe({
            next: (suppliers: Supplier[]) => {
                this.supplier = suppliers;
                this.cargando = false;
            },
            error: (error: any) => {
                console.error('Error al cargar proveedores:', error);
                this.cargando = false;
            }
        });
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }

    confirmarEliminarProveedor(prov: Supplier) {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar al proveedor "${prov.name}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.eliminarProveedor(prov.id!);
            }
        });
    }

    eliminarProveedor(id: string) {
        this.supplierService.deleteSupplier(id).subscribe({
            next: () => {
                this.supplier = this.supplier.filter((p) => p.id !== id);
                this.messageService.add({ severity: 'success', summary: 'Proveedor eliminado' });
            },
            error: (err) => {
                console.error(err);
                this.messageService.add({ severity: 'error', summary: 'Error al eliminar' });
            }
        });
    }

    handleAccionProveedor({ action, row }: { action: string; row: any }) {
        if (action === 'eliminar') {
            this.confirmarEliminarProveedor(row);
        }
    }
}
