// invoice-summary.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal, ViewChild, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { COLUMNS } from '@features/invoices/constants/columns';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { InvoiceService } from '@features/invoices/services/invoice.service';
import { TablaDinamicaComponent } from '@shared/components/tabla-dinamica/tabla-dinamica.component';
import { ConvertNumbers } from '@shared/helpers/numbers';
import { Action } from '@shared/interfaces/actions.interface';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { ModalService } from '@shared/services/modal.service';
import { ToastService } from '@shared/services/toast.service';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LayoutService } from '../../../../layout/service/layout.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AddInvoiceModalComponent } from '../../components/add-invoice-modal/add-invoice-modal.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-invoice-summary',
  templateUrl: './invoice-summary.component.html',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TablaDinamicaComponent,
    SectionHeaderComponent,
    EmptyStateComponent,
    DialogModule,
    FormsModule,
    FileUploadModule,
    IconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceSummaryComponent implements OnInit {
  @ViewChild(TablaDinamicaComponent) tablaRef!: TablaDinamicaComponent;
  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  filteredInvoices = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const allInvoices = this.invoices();

    if (!term) return allInvoices;

    return allInvoices.filter(
      (inv) =>
        (inv.supplier?.name || '').toLowerCase().includes(term) ||
        (inv.invoiceNumber || '').toLowerCase().includes(term)
    );
  });

  ConvertNumbers = ConvertNumbers;

  columns = COLUMNS;

  actions = signal<Action[]>([
    { icon: 'pi pi-eye', action: 'editar', tooltip: 'Ver detalle', color: 'primary' },
    { icon: 'pi pi-trash', action: 'eliminar', tooltip: 'Eliminar', color: 'danger' }
  ]);

  private _dynamicDialogRef: DynamicDialogRef | null = null;

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly modalService: ModalService,
    private readonly layoutService: LayoutService
  ) {}

  showMobileSearch = false;

  get isMobile(): boolean {
    return window.innerWidth < 768;
  }

  ngOnInit(): void {
    this.layoutService.setPageTitle('Facturas y albaranes');
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

  ngOnDestroy() {
    this.layoutService.setPageTitle('');
  }

  exportarPdf() {
    if (this.tablaRef) {
      this.tablaRef.exportarComoPdf();
    }
  }

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

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  openAddInvoiceModal() {
    this._dynamicDialogRef = this.modalService.open(AddInvoiceModalComponent, {
      width: '960px',
      header: 'Agregar documento',
      dismissableMask: false
    });
  }
}
