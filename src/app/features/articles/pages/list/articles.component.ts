import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { InvoiceService } from '../../../invoices/services/invoice.service';
import { ButtonModule } from 'primeng/button';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { ModalService } from '@app/shared/services/modal.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AddArticleModalComponent } from '../../components/add-article-modal/add-article-modal.component';
import { TableModule } from 'primeng/table';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, EmptyStateComponent, ButtonModule, TableModule],
  templateUrl: './articles.component.html',
})
export class ArticlesComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  private _dynamicDialogRef: DynamicDialogRef | null = null;

  hasInvoices = false;
  loading = true;

  // Local state for created articles (temporary)
  articles = signal<{ name: string }[]>([]);

  viewMode: 'list' | 'cards' = 'cards';

  ngOnInit() {
    this.invoiceService.getInvoices().subscribe({
      next: (invoices: Invoice[]) => {
        this.hasInvoices = invoices.length > 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openCreateArticle() {
    this.toastService.info('Funcionalidad en construcción', 'La creación de artículos estará disponible próximamente.');
    /*
    this._dynamicDialogRef = this.modalService.open(AddArticleModalComponent, {
      header: 'Crear nuevo artículo',
      width: '400px'
    });

    this._dynamicDialogRef.onClose.subscribe((result) => {
      if (result && result.created && result.name) {
        this.articles.update(articles => [...articles, { name: result.name }]);
      }
    });
    */
  }

  setViewMode(mode: string) {
    this.viewMode = mode as 'list' | 'cards';
  }
}
