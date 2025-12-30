import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { COLUMNS } from '../invoices/constants/columns';
import { Invoice } from '../../core/interfaces/Invoice.interfaces';
import { InvoiceService } from '../invoices/services/invoice.service';
import { TablaDinamicaComponent } from '../../shared/components/tabla-dinamica/tabla-dinamica.component';
import { ConvertNumbers } from '../../shared/helpers/numbers';
import { Action } from '../../shared/interfaces/actions.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { ModalService } from '../../shared/services/modal.service';
import { ToastService } from '../../shared/services/toast.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { AddInvoiceModalComponent } from '../invoices/components/add-invoice-modal/add-invoice-modal.component';

@Component({
  selector: 'app-doc-generator',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TablaDinamicaComponent,
    SectionHeaderComponent,
    DialogModule,
    FormsModule,
    FileUploadModule,
    CardModule
  ],
  templateUrl: './doc-generator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocGeneratorComponent implements OnInit {
  // View Control
  view = signal<'hub' | 'invoices'>('hub');

  // Invoice Data
  @ViewChild(TablaDinamicaComponent) tablaRef!: TablaDinamicaComponent;
  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  ConvertNumbers = ConvertNumbers;
  columns = COLUMNS;
  actions = signal<Action[]>([
    { icon: 'pi pi-eye', action: 'editar', tooltip: 'Ver detalle', color: 'primary' },
    { icon: 'pi pi-trash', action: 'eliminar', tooltip: 'Eliminar', color: 'danger' }
  ]);

  private _dynamicDialogRef: DynamicDialogRef | null = null;
  private invoiceService = inject(InvoiceService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  constructor() { }

  ngOnInit(): void {
    // Optionally preload or load on view switch
  }

  loadInvoices() {
    this.loading.set(true);
    this.invoiceService.getInvoices().subscribe({
      next: (data: Invoice[]) => {
        this.invoices.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error cargando facturas', err);
        this.loading.set(false);
        this.toastService.error('Error', 'No se pudieron cargar las facturas.');
      }
    });
  }

  setView(view: 'hub' | 'invoices') {
    this.view.set(view);
    if (view === 'invoices' && this.invoices().length === 0) {
      this.loadInvoices();
    }
  }

  // Invoice Logic
  verDetalle(factura: Invoice) {
    this.router.navigate(['/facturas/detalle', factura.id]);
  }

  confirmarEliminacion(factura: Invoice) {
    this.confirmDialog.confirmDeletion(
      `¿Seguro que deseas eliminar la factura <b>${factura.invoiceNumber || 'sin número'}</b>?`,
      {
        acceptLabel: 'Sí',
        rejectLabel: 'No',
        onAccept: () => {
          this.eliminarFactura(factura);
        }
      }
    );
  }

  eliminarFactura(factura: Invoice) {
    if (!factura.id) {
      console.warn('No se puede eliminar una factura sin ID.');
      return;
    }

    this.invoiceService.deleteInvoice(factura.id).subscribe({
      next: () => {
        this.invoices.update((facturas) => facturas.filter((f) => f.id !== factura.id));
        this.toastService.success('Factura eliminada', 'La factura ha sido eliminada correctamente.');
      },
      error: (error: any) => {
        console.error('Error eliminando la factura:', error);
        this.toastService.error('Error', error.error?.message || 'No se pudo eliminar la factura. Intenta nuevamente.');
      }
    });
  }

  handleAccion(event: { action: string; row: any }) {
    if (event.action === 'editar') {
      this.verDetalle(event.row);
    } else if (event.action === 'eliminar') {
      this.confirmarEliminacion(event.row);
    }
  }

  openAddInvoiceModal() {
    this._dynamicDialogRef = this.modalService.open(AddInvoiceModalComponent, {
      width: '960px',
      header: 'Agregar documento',
      dismissableMask: false
    });
  }

  onHeaderSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    console.log('Search:', input.value);
  }
}
