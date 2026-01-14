import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { InvoiceService } from '../../../invoices/services/invoice.service';
import { ButtonModule } from 'primeng/button';
import { Invoice } from '@app/core/interfaces/Invoice.interfaces';
import { ModalService } from '@app/shared/services/modal.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AddArticleModalComponent } from '../../components/add-article-modal/add-article-modal.component';
import { TableModule } from 'primeng/table';
import { ToastService } from '../../../../shared/services/toast.service';

import { IconComponent } from '../../../../shared/components/icon/icon.component';

import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ButtonModule, TableModule, IconComponent, FormsModule, InputTextModule, DropdownModule],
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

  // Add Article Form State
  showAddArticleForm = signal<boolean>(false);
  newArticleName = signal<string>('');
  newArticleType = signal<any>(null);

  // Add Elaboration Form State
  showAddElaborationForm = signal<boolean>(false);
  newElaborationName = signal<string>('');

  articleTypes = [
    { label: 'Aperitivo', value: 'aperitivo' },
    { label: 'Entrante', value: 'entrante' },
    { label: 'Principal', value: 'principal' },
    { label: 'Postre', value: 'postre' },
    { label: 'Bebida', value: 'bebida' }
  ];

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

  // State for expanded card view
  selectedCategory: string | null = null;

  selectCategory(category: string) {
    if (this.selectedCategory === category) {
      this.closeDetail();
      return;
    }
    this.selectedCategory = category;
    this.resetForms();
  }

  closeDetail() {
    this.selectedCategory = null;
    this.resetForms();
  }

  toggleAddArticleForm() {
    this.showAddArticleForm.update(v => !v);
  }

  toggleAddElaborationForm() {
    this.showAddElaborationForm.update(v => !v);
  }

  resetForms() {
    this.showAddArticleForm.set(false);
    this.newArticleName.set('');
    this.newArticleType.set(null);
    this.showAddElaborationForm.set(false);
    this.newElaborationName.set('');
  }

  get categoryDisplayName(): string {
    if (!this.selectedCategory) return '';
    return this.selectedCategory === 'mise-en-place' ? 'Mise en place' : this.selectedCategory;
  }

  searchTerm = signal<string>('');

  onSearch(event: any) {
    this.searchTerm.set(event.target.value);
  }

  setViewMode(mode: string) {
    this.viewMode = mode as 'list' | 'cards';
  }
}
