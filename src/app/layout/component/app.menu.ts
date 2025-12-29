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
  templateUrl: './app.menu.html',
  styleUrls: ['./app.menu.scss']
})
export class AppMenu {
  model: MenuItem[] = [];

  constructor(private translate: TranslateService) { }

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
          { label: this.translate.instant('menu.documentation'), icon: 'pi pi-fw pi-file', routerLink: ['/docgenerator']},
          { label: this.translate.instant('menu.schedules'), icon: 'pi pi-fw pi-calendar', routerLink: ['/horarios'] },
          { label: this.translate.instant('menu.settings'), icon: 'pi pi-fw pi-cog', routerLink: ['/configuracion'] }
        ]
      }
    ];
  }
}
