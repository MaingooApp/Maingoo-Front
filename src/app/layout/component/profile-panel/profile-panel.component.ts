import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LayoutService } from '../../service/layout.service';
import { AuthService } from '../../../features/auth/services/auth-service.service';

import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
	selector: 'app-profile-panel',
	standalone: true,
	imports: [CommonModule, RouterModule, IconComponent],
	templateUrl: './profile-panel.component.html'
})
export class ProfilePanelComponent {
	layoutService = inject(LayoutService);
	private authService = inject(AuthService);
	private router = inject(Router);

	toggleProfile() {
		this.layoutService.toggleProfilePanel();
	}

	toggleDarkMode() {
		this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
	}

	openSettings() {
		// TODO: Implementar lógica para abrir panel de configuración
		console.log('Configuración clickeada');
	}

	logout() {
		this.authService.logout();
		this.router.navigate(['/auth/login']);
	}
}
