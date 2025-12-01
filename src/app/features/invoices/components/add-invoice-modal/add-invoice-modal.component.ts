import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { documentTypes } from '@app/core/interfaces/document-type.interface';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { toSignal } from '@angular/core/rxjs-interop';
import { DocumentType } from '@app/core/enums/documents.enum';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ToastService } from '@shared/services/toast.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { DocumentAnalysisService } from '@app/core/services/document-analysis.service';
import { interval, Subscription, switchMap, takeWhile } from 'rxjs';

@Component({
  selector: 'app-add-invoice-modal',
  imports: [
    InputTextModule,
    FluidModule,
    ButtonModule,
    SelectModule,
    ReactiveFormsModule,
    TextareaModule,
    FileUploadModule
  ],
  templateUrl: './add-invoice-modal.component.html',
  styleUrl: './add-invoice-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddInvoiceModalComponent {
  @ViewChild('fu') fileUpload!: FileUpload;

  private _fb = inject(FormBuilder);
  private readonly _toastService = inject(ToastService);
  private readonly _ref = inject(DynamicDialogRef);
  private readonly documentAnalysisService = inject(DocumentAnalysisService);

  readonly documentTypesList = Object.values(documentTypes);

  readonly hasDeliveryNotesOptions = [
    { label: 'Sí', value: true },
    { label: 'No', value: false }
  ];

  selectedFile = signal<File | null>(null);
  isInvoice = computed(() => this.documentTypeSig() === DocumentType.INVOICE);

  form = this._fb.group({
    documentType: [null, Validators.required],
    hasDeliveryNotes: [false]
  });

  readonly documentTypeSig = toSignal(this.form.controls['documentType'].valueChanges, {
    initialValue: this.form.controls['documentType'].value
  });

  readonly formStatusSig = toSignal(this.form.statusChanges, {
    initialValue: this.form.status
  });

  readonly isFormValid = computed(() => this.formStatusSig() === 'VALID');

  readonly canSubmit = computed(() => this.isFormValid() && !!this.selectedFile());

  private pollingSubscription?: Subscription;

  onClear() {
    this.selectedFile.set(null);
  }

  onFileSelect(event: any) {
    const files = event.files as File[];
    const file = files?.[0];

    if (!file) {
      this.selectedFile.set(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      this.fileUpload.clear();
      this._toastService.warn('Archivo muy grande', 'El archivo no puede superar los 20MB');
      this.selectedFile.set(null);
      return;
    }

    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ];

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (!fileType || (!validTypes.includes(fileType) && !fileName.match(/\.(jpg|jpeg|png|webp|heic|heif|pdf)$/))) {
      this._toastService.warn('Formato inválido', 'Selecciona una imagen o PDF válido');
      this.fileUpload.clear();
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);
  }

  onSubmit() {
    if (!this.canSubmit()) return;

    const file = this.selectedFile();
    const { documentType, hasDeliveryNotes } = this.form.value;

    if (
      !file ||
      documentType === null ||
      documentType === undefined ||
      hasDeliveryNotes === null ||
      hasDeliveryNotes === undefined
    )
      return;

    this.uploadInvoice(file, { documentType, hasDeliveryNotes });
    this._ref.close({ uploaded: true });
  }

  private uploadInvoice(file: File, data: { documentType: string; hasDeliveryNotes: boolean }) {
    this.documentAnalysisService.submitInvoiceForAnalysis(file, data).subscribe({
      next: (response) => {
        this._toastService.success('Documento subido', 'El documento está siendo analizado por IA...', 3000);
        this.startPollingDocumentStatus(response.documentId);
      },
      error: (error) => {
        console.error('Error al subir documento:', error);

        let errorDetail = 'No se pudo subir el archivo. ';

        if (error?.status === 0) {
          errorDetail += 'No hay conexión con el servidor. Verifica tu conexión a internet.';
        } else if (error?.error?.message) {
          errorDetail += error.error.message;
        } else if (error?.message) {
          errorDetail += error.message;
        } else {
          errorDetail += 'Error desconocido. Por favor intenta nuevamente.';
        }

        this._toastService.error('Error al subir', errorDetail, 5000);
      }
    });
  }

  private startPollingDocumentStatus(documentId: string) {
    this.pollingSubscription = interval(3000)
      .pipe(
        switchMap(() => this.documentAnalysisService.getDocumentById(documentId)),
        takeWhile((doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING', true)
      )
      .subscribe({
        next: (document) => {
          if (document.status === 'PROCESSING') {
          } else if (document.status === 'DONE') {
            this._toastService.success('Análisis completo', 'El documento ha sido analizado correctamente', 5000);
          } else if (document.status === 'FAILED') {
            this._toastService.error('Error en análisis', 'El análisis del documento ha fallado', 5000);
          }
        },
        error: (error) => {
          console.error('Error al verificar estado:', error);
          this._toastService.error('Error', 'No se pudo verificar el estado del análisis', 5000);
        }
      });
  }

  closeModal() {
    this._ref.close();
  }

  ngOnDestroy() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }
}
