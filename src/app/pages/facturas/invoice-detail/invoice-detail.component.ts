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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';

@Component({
    selector: 'app-invoice-detail',
    imports: [CommonModule, RouterModule, ButtonModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, DialogModule],
    templateUrl: './invoice-detail.component.html'
})
export class InvoiceDetailComponent {
    factura: any;
    ConvertNumbers = ConvertNumbers;
    mostrarImagen = false;
    pdfUrlSanitizado: SafeResourceUrl | null = null;

    ngOnInit() {
        if (this.factura?.mimeType === 'application/pdf' && this.factura.imagen) {
            const base64Url = 'data:application/pdf;base64,' + this.factura.imagen;
            this.pdfUrlSanitizado = this.sanitizer.bypassSecurityTrustResourceUrl(base64Url);
        }
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private sanitizer: DomSanitizer
    ) {
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
