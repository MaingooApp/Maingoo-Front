// invoice-summary.component.ts
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  ViewChild,
  computed,
  TemplateRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AddInvoiceModalComponent } from '../../components/add-invoice-modal/add-invoice-modal.component';
import { InvoiceSummarySectionHeaderDetailComponent } from './components/invoice-summary-section-header-detail/invoice-summary-section-header-detail.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '../../../../core/constants/permissions.enum';

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
    EmptyStateComponent,
    DialogModule,
    FormsModule,
    FileUploadModule,
    InvoiceSummarySectionHeaderDetailComponent,
    NgxPermissionsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceSummaryComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly P = AppPermission;
  @ViewChild(TablaDinamicaComponent) tablaRef!: TablaDinamicaComponent;
  @ViewChild('headerTpl') headerTpl!: TemplateRef<unknown>;
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
    { icon: 'visibility', action: 'editar', tooltip: 'Ver detalle', color: 'primary' },
    { icon: 'delete', action: 'eliminar', tooltip: 'Eliminar', color: 'danger' }
  ]);

  private _dynamicDialogRef: DynamicDialogRef | null = null;

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly modalService: ModalService,
    private readonly headerService: SectionHeaderService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.invoiceService
      .getInvoices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: Invoice[]) => {
          this.invoices.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Error', 'No se pudieron cargar las facturas.');
        }
      });
  }

  ngOnDestroy() {
    this.headerService.reset();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
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
      this.toastService.warn('Atención', 'No se puede eliminar una factura sin ID.');
      return;
    }

    this.invoiceService
      .deleteInvoice(factura.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.invoices.update((facturas) => facturas.filter((f) => f.id !== factura.id));
          this.toastService.success('Factura eliminada', 'La factura ha sido eliminada correctamente.');
        },
        error: (error: unknown) => {
          this.toastService.error(
            'Error',
            this.getErrorMessage(error, 'No se pudo eliminar la factura. Intenta nuevamente.')
          );
        }
      });
  }

  handleAccion(event: { action: string; row: unknown }) {
    if (!this.isInvoice(event.row)) {
      this.toastService.error('Error', 'La acción no se puede aplicar a esta fila.');
      return;
    }

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

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const nestedError = (error as { error?: { message?: unknown } }).error;
      if (typeof nestedError?.message === 'string') {
        return nestedError.message;
      }
    }

    return fallback;
  }

  private isInvoice(value: unknown): value is Invoice {
    return typeof value === 'object' && value !== null && 'id' in value && 'amount' in value && 'date' in value;
  }
}
