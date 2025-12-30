import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { InvoiceService } from '../../../invoices/services/invoice.service';
import { ButtonModule } from 'primeng/button';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, EmptyStateComponent, ButtonModule],
  templateUrl: './articles.component.html',
})
export class ArticlesComponent implements OnInit {
  private invoiceService = inject(InvoiceService);

  hasInvoices = false;
  loading = true;

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
    // TODO: Implement create article logic
    console.log('Crear artículo');
  }
}
