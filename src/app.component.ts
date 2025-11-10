import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import packageJson from '../package.json';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, HttpClientModule, ConfirmDialogModule, ToastModule],
    templateUrl: './app.component.html'
})
export class AppComponent {
    constructor() {
        console.warn('Version:', packageJson.version);
    }
}
