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
  standalone: true,
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

  // Límite máximo de archivos
  private readonly MAX_FILES = 50;

  readonly documentTypesList = Object.values(documentTypes);

  readonly hasDeliveryNotesOptions = [
    { label: 'Sí', value: true },
    { label: 'No', value: false }
  ];

  // Ahora manejamos múltiples archivos
  selectedFiles = signal<File[]>([]);
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

  // Ahora verificamos que haya al menos un archivo seleccionado
  readonly canSubmit = computed(() => this.isFormValid() && this.selectedFiles().length > 0);

  // Etiqueta dinámica del botón según cantidad de archivos
  readonly submitButtonLabel = computed(() => {
    const count = this.selectedFiles().length;
    if (count === 0) return 'Subir documentos';
    if (count === 1) return 'Subir 1 documento';
    return `Subir ${count} documentos`;
  });

  private pollingSubscriptions: Subscription[] = [];

  onClear() {
    this.selectedFiles.set([]);
  }

  onRemoveFile(event: { file: File }) {
    const currentFiles = this.selectedFiles();
    const updatedFiles = currentFiles.filter((f) => f.name !== event.file.name || f.size !== event.file.size);
    this.selectedFiles.set(updatedFiles);
  }

  onFileSelect(event: { files: File[] }) {
    const newFiles = event.files;
    const currentFiles = this.selectedFiles();
    const validFiles: File[] = [];

    // Verificar límite total de archivos (existentes + nuevos)
    const totalFiles = currentFiles.length + newFiles.length;
    if (totalFiles > this.MAX_FILES) {
      this._toastService.warn(
        'Límite excedido',
        `Solo puedes subir un máximo de ${this.MAX_FILES} archivos. Ya tienes ${currentFiles.length} seleccionados.`
      );
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

    for (const file of newFiles) {
      // Verificar si ya existe (por nombre y tamaño)
      const isDuplicate = currentFiles.some((f) => f.name === file.name && f.size === file.size);
      if (isDuplicate) {
        this._toastService.warn('Archivo duplicado', `"${file.name}" ya está seleccionado`);
        continue;
      }

      // Verificar tamaño
      if (file.size > 20 * 1024 * 1024) {
        this._toastService.warn('Archivo muy grande', `"${file.name}" supera los 20MB y fue ignorado`);
        continue;
      }

      // Verificar tipo
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();

      if (!fileType || (!validTypes.includes(fileType) && !fileName.match(/\.(jpg|jpeg|png|webp|heic|heif|pdf)$/))) {
        this._toastService.warn('Formato inválido', `"${file.name}" no es un formato válido`);
        continue;
      }

      validFiles.push(file);
    }

    // Acumular los nuevos archivos válidos con los existentes
    this.selectedFiles.set([...currentFiles, ...validFiles]);
  }

  onSubmit() {
    if (!this.canSubmit()) return;

    const files = this.selectedFiles();
    const { documentType, hasDeliveryNotes } = this.form.value;

    if (
      files.length === 0 ||
      documentType === null ||
      documentType === undefined ||
      hasDeliveryNotes === null ||
      hasDeliveryNotes === undefined
    )
      return;

    this.uploadInvoices(files, { documentType, hasDeliveryNotes });
    this._ref.close({ uploaded: true });
  }

  private uploadInvoices(files: File[], data: { documentType: string; hasDeliveryNotes: boolean }) {
    this.documentAnalysisService.submitBatchForAnalysis(files, data).subscribe({
      next: (response) => {
        const successCount = response.success;
        const failedCount = response.failed;

        if (successCount > 0) {
          this._toastService.success(
            'Documentos subidos',
            `${successCount} documento${successCount > 1 ? 's están siendo analizados' : ' está siendo analizado'} por IA...`,
            3000
          );
        }

        if (failedCount > 0) {
          this._toastService.warn(
            'Algunos archivos fallaron',
            `${failedCount} archivo${failedCount > 1 ? 's no pudieron' : ' no pudo'} subirse`,
            5000
          );
        }

        // Iniciar polling para cada documento exitoso
        response.results
          .filter((r) => r.success)
          .forEach((result) => {
            this.startPollingDocumentStatus(result.documentId);
          });
      },
      error: (error) => {
        console.error('Error al subir documentos:', error);

        let errorDetail = 'No se pudieron subir los archivos. ';

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
    const subscription = interval(3000)
      .pipe(
        switchMap(() => this.documentAnalysisService.getDocumentById(documentId)),
        takeWhile((doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING', true)
      )
      .subscribe({
        next: (document) => {
          if (document.status === 'DONE') {
            this._toastService.success(
              'Análisis completo',
              `El documento "${document.filename}" ha sido analizado correctamente`,
              5000
            );
          } else if (document.status === 'FAILED') {
            this._toastService.error(
              'Error en análisis',
              document.errorReason || `El análisis de "${document.filename}" ha fallado`,
              5000
            );
          }
        },
        error: (error) => {
          console.error('Error al verificar estado:', error);
          this._toastService.error('Error', 'No se pudo verificar el estado del análisis', 5000);
        }
      });

    this.pollingSubscriptions.push(subscription);
  }

  closeModal() {
    this._ref.close();
  }

  ngOnDestroy() {
    this.pollingSubscriptions.forEach((sub) => sub.unsubscribe());
  }
}

