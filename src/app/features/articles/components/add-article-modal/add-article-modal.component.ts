import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-add-article-modal',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		InputTextModule,
		ButtonModule,
		FluidModule
	],
	templateUrl: './add-article-modal.component.html',
	host: { class: 'block' },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddArticleModalComponent {
	private _ref = inject(DynamicDialogRef);

	nameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);

	closeModal() {
		this._ref.close();
	}

	onSubmit() {
		if (this.nameControl.valid) {
			this._ref.close({ created: true, name: this.nameControl.value });
		}
	}
}
