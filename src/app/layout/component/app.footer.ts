import { Component } from '@angular/core';

@Component({
	standalone: true,
	selector: 'app-footer',
	template: `<div class="layout-footer">
        Maingoo © {{ currentYear }}
    </div>`
})
export class AppFooter {
	currentYear = new Date().getFullYear();
}
