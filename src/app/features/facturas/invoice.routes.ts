import { Routes } from "@angular/router";
import { InvoiceSummaryComponent } from "./invoice-summary/invoice-summary.component";
import { InvoiceDetailComponent } from "./invoice-detail/invoice-detail.component";

const appRoutes: Routes = [
	{path: '', component: InvoiceSummaryComponent},
    {path: 'detalle/:id', component: InvoiceDetailComponent},
    {path: '**', redirectTo: '/' }
];

export default appRoutes;

