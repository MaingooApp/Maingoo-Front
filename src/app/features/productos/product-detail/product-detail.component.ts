import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InvoiceService, Product } from '../../../core/services/invoice.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
    selector: 'app-product-detail',
    imports: [CommonModule, RouterModule, ButtonModule],
    templateUrl: './product-detail.component.html'
})
export class ProductDetailComponent implements OnInit {
    producto: Product | null = null;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private invoiceService: InvoiceService,
        private toastService: ToastService
    ) {}

    ngOnInit(): void {
        const productId = this.route.snapshot.paramMap.get('id');

        if (!productId) {
            this.toastService.error('Error', 'No se proporcionó un ID de producto válido.');
            this.router.navigate(['/productos']);
            return;
        }

        this.cargarProducto(productId);
    }

    private cargarProducto(id: string) {
        this.loading = true;
        this.invoiceService.getProductById(id).subscribe({
            next: (producto) => {
                this.producto = producto;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error cargando producto:', error);
                this.loading = false;
                this.toastService.error('Error', 'No se pudo cargar el producto. Intenta nuevamente.');
                this.router.navigate(['/productos']);
            }
        });
    }

    volver() {
        this.router.navigate(['/productos']);
    }
}
