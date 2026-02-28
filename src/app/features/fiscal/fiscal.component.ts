import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  inject,
  computed,
  ViewChild,
  TemplateRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Invoice } from '../../core/interfaces/Invoice.interfaces';
import { InvoiceService } from '../invoices/services/invoice.service';
import { GestorService } from './services/gestor.service';
import { Gestor } from './interfaces/gestor.interface';

import { ConvertNumbers } from '../../shared/helpers/numbers';

import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { ModalService } from '../../shared/services/modal.service';
import { ToastService } from '../../shared/services/toast.service';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { AddInvoiceModalComponent } from '../invoices/components/add-invoice-modal/add-invoice-modal.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TextareaModule } from 'primeng/textarea';
import { FiscalSectionHeaderDetailComponent } from './components/fiscal-section-header-detail/fiscal-section-header-detail.component';

export interface SupplierGroup {
  supplierName: string;
  invoices: Invoice[];
  total: number;
  expanded: boolean;
}

export interface QuarterGroup {
  name: string; // "Q1 (Ene - Mar)", etc.
  suppliers: SupplierGroup[];
  total: number;
  expanded: boolean;
}

export interface GroupedInvoices {
  year: number;
  quarters: QuarterGroup[];
  total: number;
  expanded: boolean;
}

@Component({
  selector: 'app-fiscal',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    DialogModule,
    FormsModule,
    FileUploadModule,
    CardModule,
    IconComponent,
    TextareaModule,
    FiscalSectionHeaderDetailComponent
  ],
  templateUrl: './fiscal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocGeneratorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('headerTpl') headerTpl!: TemplateRef<any>;
  private headerService = inject(SectionHeaderService);

  // View Control
  view = signal<'hub' | 'invoices' | 'manager' | 'payroll' | 'supplies'>('hub');
  viewMode = signal<'cards' | 'list'>('cards');

  // Invoice Data
  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  ConvertNumbers = ConvertNumbers;

  // Search
  searchTerm = signal('');

  // Modal de verificación para borrar todas las facturas
  showDeleteVerificationModal = signal(false);
  deleteVerificationText = signal('');

  // Gestor Data
  gestor = signal<Gestor | null>(null);
  gestorLoading = signal(false);
  isEditingManager = signal(false);

  // Local form fields for editing
  gestorForm = signal<{
    name: string;
    business: string;
    email: string;
    phoneNumber: string;
    address: string;
    notes: string;
  }>({
    name: '',
    business: '',
    email: '',
    phoneNumber: '',
    address: '',
    notes: ''
  });

  // Derived: Grouped Invoices
  groupedInvoices = computed(() => {
    let invoices = this.invoices();
    const term = this.searchTerm();

    // Filter First
    if (term) {
      const normalizedTerm = this.normalizeText(term);
      invoices = invoices.filter(
        (inv) =>
          this.normalizeText(inv.supplier?.name || '').includes(normalizedTerm) ||
          this.normalizeText(inv.invoiceNumber || '').includes(normalizedTerm) ||
          (inv.amount?.toString() || '').includes(normalizedTerm)
      );
    }

    if (!invoices.length) return [];

    const grouped: GroupedInvoices[] = [];

    // Helper to get Quarter
    const getQuarter = (date: Date): string => {
      const month = date.getMonth();
      if (month < 3) return '1º Trimestre (Ene - Mar)';
      if (month < 6) return '2º Trimestre (Abr - Jun)';
      if (month < 9) return '3º Trimestre (Jul - Sep)';
      return '4º Trimestre (Oct - Dic)';
    };

    invoices.forEach((inv) => {
      const date = new Date(inv.date);
      const year = date.getFullYear();
      const quarterName = getQuarter(date);
      const supplierName = inv.supplier?.name || 'Proveedor Desconocido';

      // 1. Find or Create Year Group
      let yearGroup = grouped.find((g) => g.year === year);
      if (!yearGroup) {
        yearGroup = { year, quarters: [], total: 0, expanded: true };
        grouped.push(yearGroup);
      }

      // 2. Find or Create Quarter Group
      let quarterGroup = yearGroup.quarters.find((q) => q.name === quarterName);
      if (!quarterGroup) {
        quarterGroup = { name: quarterName, suppliers: [], total: 0, expanded: true };
        yearGroup.quarters.push(quarterGroup);
      }

      // 3. Find or Create Supplier Group
      let supplierGroup = quarterGroup.suppliers.find((s) => s.supplierName === supplierName);
      if (!supplierGroup) {
        supplierGroup = { supplierName, invoices: [], total: 0, expanded: false };
        quarterGroup.suppliers.push(supplierGroup);
      }

      // Add Invoice
      supplierGroup.invoices.push(inv);

      // Update Totals
      const amount = Number(inv.amount || 0);
      supplierGroup.total += amount;
      quarterGroup.total += amount;
      yearGroup.total += amount;
    });

    // Sort Structures
    grouped.sort((a, b) => b.year - a.year);

    grouped.forEach((y) => {
      y.quarters.sort((a, b) => b.name.localeCompare(a.name));
      y.quarters.forEach((q) => {
        q.suppliers.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
        q.suppliers.forEach((s) => {
          s.invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      });
    });

    const shouldExpandAll = !!term;
    grouped.forEach((g, index) => (g.expanded = shouldExpandAll || index === 0));
    if (shouldExpandAll) {
      grouped.forEach((y) => {
        y.quarters.forEach((q) => {
          q.expanded = true;
          q.suppliers.forEach((s) => (s.expanded = true));
        });
      });
    }

    return grouped;
  });

  private _dynamicDialogRef: DynamicDialogRef | null = null;
  private invoiceService = inject(InvoiceService);
  private gestorService = inject(GestorService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  constructor() {}

  ngOnInit(): void {
    this.loadInvoices();
    this.loadGestor();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy(): void {
    this.headerService.reset();
  }

  loadGestor() {
    this.gestorLoading.set(true);
    this.gestorService.getGestors().subscribe({
      next: (gestors: Gestor[]) => {
        const gestor = gestors.length > 0 ? gestors[0] : null;
        this.gestor.set(gestor);
        if (gestor) {
          this.gestorForm.set({
            name: gestor.name ?? '',
            business: gestor.business ?? '',
            email: gestor.email ?? '',
            phoneNumber: gestor.phoneNumber ?? '',
            address: gestor.address ?? '',
            notes: gestor.notes ?? ''
          });
        }
        this.gestorLoading.set(false);
      },
      error: () => {
        this.gestorLoading.set(false);
        this.toastService.error('Error', 'No se pudo cargar la información del gestor.');
      }
    });
  }

  startEditingManager() {
    const g = this.gestor();
    this.gestorForm.set({
      name: g?.name ?? '',
      business: g?.business ?? '',
      email: g?.email ?? '',
      phoneNumber: g?.phoneNumber ?? '',
      address: g?.address ?? '',
      notes: g?.notes ?? ''
    });
    this.isEditingManager.set(true);
  }

  saveGestor() {
    const form = this.gestorForm();
    const existing = this.gestor();
    const dto = {
      name: form.name,
      business: form.business || undefined,
      email: form.email || undefined,
      phoneNumber: form.phoneNumber || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined
    };

    if (existing?.id) {
      this.gestorService.updateGestor(existing.id, dto).subscribe({
        next: (updated: Gestor) => {
          this.gestor.set(updated);
          this.isEditingManager.set(false);
          this.toastService.success('Gestor actualizado', 'Los datos del gestor se han guardado correctamente.');
        },
        error: () => {
          this.toastService.error('Error', 'No se pudo actualizar el gestor.');
        }
      });
    } else {
      this.gestorService.createGestor(dto).subscribe({
        next: (created: Gestor) => {
          this.gestor.set(created);
          this.isEditingManager.set(false);
          this.toastService.success('Gestor creado', 'El gestor ha sido añadido correctamente.');
        },
        error: () => {
          this.toastService.error('Error', 'No se pudo crear el gestor.');
        }
      });
    }
  }

  cancelEditManager() {
    this.isEditingManager.set(false);
  }

  updateForm(field: string, value: string) {
    this.gestorForm.update((f) => ({ ...f, [field]: value }));
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

  setView(view: 'hub' | 'invoices' | 'manager' | 'payroll' | 'supplies') {
    this.view.set(view);
    if (view === 'invoices' && this.invoices().length === 0) {
      this.loadInvoices();
    }
  }

  setViewMode(mode: string) {
    this.viewMode.set(mode as 'cards' | 'list');
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

  openAddInvoiceModal() {
    this._dynamicDialogRef = this.modalService.open(AddInvoiceModalComponent, {
      width: '960px',
      header: 'Agregar documento',
      dismissableMask: false
    });
  }

  onHeaderSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  confirmarBorrarTodas() {
    const totalFacturas = this.invoices().length;
    if (totalFacturas === 0) return;

    this.confirmDialog.confirmDeletion(
      `¿Estás seguro de que deseas eliminar <b>todas las ${totalFacturas} facturas</b>? Esta acción no se puede deshacer.`,
      {
        acceptLabel: 'Sí, continuar',
        rejectLabel: 'Cancelar',
        onAccept: () => {
          this.deleteVerificationText.set('');
          this.showDeleteVerificationModal.set(true);
        }
      }
    );
  }

  verificarYBorrar() {
    const textoEsperado = 'Borrar Facturas';
    if (this.deleteVerificationText() !== textoEsperado) {
      this.toastService.error('Error', `Debes escribir exactamente "${textoEsperado}" para confirmar.`);
      return;
    }

    this.showDeleteVerificationModal.set(false);
    this.deleteVerificationText.set('');
    this.borrarTodasLasFacturas();
  }

  cancelarVerificacion() {
    this.showDeleteVerificationModal.set(false);
    this.deleteVerificationText.set('');
  }

  borrarTodasLasFacturas() {
    const facturas = this.invoices();
    const facturasConId = facturas.filter((f) => f.id);

    if (facturasConId.length === 0) {
      this.toastService.warn('Atención', 'No hay facturas para eliminar.');
      return;
    }

    this.loading.set(true);
    let eliminadas = 0;
    let errores = 0;

    const eliminarSiguiente = (index: number) => {
      if (index >= facturasConId.length) {
        this.loading.set(false);
        if (errores === 0) {
          this.toastService.success('Completado', `Se eliminaron ${eliminadas} facturas correctamente.`);
          this.invoices.set([]);
        } else {
          this.toastService.warn(
            'Completado con errores',
            `Se eliminaron ${eliminadas} facturas. ${errores} fallaron.`
          );
          this.loadInvoices();
        }
        return;
      }

      const factura = facturasConId[index];
      this.invoiceService.deleteInvoice(factura.id!).subscribe({
        next: () => {
          eliminadas++;
          eliminarSiguiente(index + 1);
        },
        error: () => {
          errores++;
          eliminarSiguiente(index + 1);
        }
      });
    };

    eliminarSiguiente(0);
  }
}
