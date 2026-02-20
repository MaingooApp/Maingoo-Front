import { Injectable, signal, TemplateRef } from '@angular/core';

/**
 * Service to manage the global Section Header content.
 * Features register their header template, and the layout shell renders it.
 */
@Injectable({
	providedIn: 'root'
})
export class SectionHeaderService {
	// The content template registered by the active feature
	content = signal<TemplateRef<any> | null>(null);

	// Whether to show the header shell (some pages may want to hide it)
	visible = signal<boolean>(true);

	/**
	 * Register a template to be rendered in the header shell.
	 * Called by features in ngAfterViewInit.
	 */
	setContent(template: TemplateRef<any> | null) {
		this.content.set(template);
	}

	/**
	 * Show or hide the header shell.
	 */
	setVisible(visible: boolean) {
		this.visible.set(visible);
	}

	/**
	 * Reset the header (called in ngOnDestroy of features).
	 */
	reset() {
		this.content.set(null);
		this.visible.set(true);
	}
}
