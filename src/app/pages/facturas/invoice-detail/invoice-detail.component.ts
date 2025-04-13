import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConvertNumbers } from '../../../core/helpers/numbers';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-invoice-detail',
  imports: [CommonModule, 
    RouterModule, 
    ButtonModule, 
    TableModule ,
    InputTextModule,
    IconFieldModule,
    InputIconModule
    ],
  templateUrl: './invoice-detail.component.html'
})
export class InvoiceDetailComponent {
  factura: any;
  ConvertNumbers = ConvertNumbers;

  constructor(private route: ActivatedRoute, private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.factura = nav?.extras?.state?.['factura'];

    if (!this.factura) {
      this.router.navigate(['/']);
    }
  }

  volver() {
    this.router.navigate(['/facturas']);
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
  
}
