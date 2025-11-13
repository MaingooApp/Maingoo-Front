import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule, TranslateModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    constructor(private translate: TranslateService) {}

    ngOnInit() {
        this.loadMenu();
        this.translate.onLangChange.subscribe(() => {
            this.loadMenu();
        });
    }

    private loadMenu() {
        this.model = [
            {
                label: this.translate.instant('menu.home'),
                items: [
                    { label: this.translate.instant('menu.dashboard'), icon: 'pi pi-fw pi-home', routerLink: ['/'] },
                    { label: this.translate.instant('menu.invoices'), icon: 'pi pi-fw pi-receipt', routerLink: ['/facturas'] },
                    { label: this.translate.instant('menu.suppliers'), icon: 'pi pi-fw pi-box', routerLink: ['/proveedores'] },
                    { label: this.translate.instant('menu.products'), icon: 'pi pi-fw pi-tags', routerLink: ['/productos'] },
                    { label: this.translate.instant('menu.documentation'), icon: 'pi pi-fw pi-file', routerLink: ['/docgenerator'] },
                    { label: this.translate.instant('menu.schedules'), icon: 'pi pi-fw pi-calendar', routerLink: ['/Horarios'] }
                ]
            },
            {
                label: this.translate.instant('menu.ui_components'),
                items: [
                    { label: this.translate.instant('menu.form_layout'), icon: 'pi pi-fw pi-id-card', routerLink: ['/uikit/formlayout'] },
                    { label: this.translate.instant('menu.input'), icon: 'pi pi-fw pi-check-square', routerLink: ['/uikit/input'] },
                    { label: this.translate.instant('menu.button'), icon: 'pi pi-fw pi-mobile', class: 'rotated-icon', routerLink: ['/uikit/button'] },
                    { label: this.translate.instant('menu.table'), icon: 'pi pi-fw pi-table', routerLink: ['/uikit/table'] },
                    { label: this.translate.instant('menu.list'), icon: 'pi pi-fw pi-list', routerLink: ['/uikit/list'] },
                    { label: this.translate.instant('menu.tree'), icon: 'pi pi-fw pi-share-alt', routerLink: ['/uikit/tree'] },
                    { label: this.translate.instant('menu.panel'), icon: 'pi pi-fw pi-tablet', routerLink: ['/uikit/panel'] },
                    { label: this.translate.instant('menu.overlay'), icon: 'pi pi-fw pi-clone', routerLink: ['/uikit/overlay'] },
                    { label: this.translate.instant('menu.media'), icon: 'pi pi-fw pi-image', routerLink: ['/uikit/media'] },
                    { label: this.translate.instant('menu.menu'), icon: 'pi pi-fw pi-bars', routerLink: ['/uikit/menu'] },
                    { label: this.translate.instant('menu.message'), icon: 'pi pi-fw pi-comment', routerLink: ['/uikit/message'] },
                    { label: this.translate.instant('menu.file'), icon: 'pi pi-fw pi-file', routerLink: ['/uikit/file'] },
                    { label: this.translate.instant('menu.chart'), icon: 'pi pi-fw pi-chart-bar', routerLink: ['/uikit/charts'] },
                    { label: this.translate.instant('menu.timeline'), icon: 'pi pi-fw pi-calendar', routerLink: ['/uikit/timeline'] },
                    { label: this.translate.instant('menu.misc'), icon: 'pi pi-fw pi-circle', routerLink: ['/uikit/misc'] }
                ]
            },
        ];
    }
}
