import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { FluidModule } from 'primeng/fluid';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';
import { OpenaiService } from '../../core/services/openai.service';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-upload',
  imports: [FluidModule, 
    ButtonModule, 
    FileUploadModule, 
    FormsModule, 
    CommonModule, 
    MessagesModule, 
    ToastModule, 
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule
  ],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss',
  providers: [MessageService],
})
export class UploadComponent {

  constructor(private messageService: MessageService,
    private openaiService: OpenaiService
  ) { }
  resultado: any = null;
  msg: string = '';
  cargando = false;

  onUpload(event: any) {
    const files = event.files as File[];
    if (!files || files.length === 0) return;

    const file = files[0]; // Tomamos solo el primero por ahora
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const mimeType = file.type;
      this.enviarAOpenAI(base64, mimeType);
    };

    reader.readAsDataURL(file);
  }

  enviarAOpenAI(base64: string,mimeType: string) {
    if (this.cargando) return;
    this.cargando = true;
    this.msg = 'Analizando imagen...';

    this.openaiService.analizarImagen(base64, mimeType).subscribe({
      next: (res: any) => {
        this.cargando = false;
        console.log(res);

        const texto = res.choices[0].message.content;
        const inicio = texto.indexOf('{');
        const fin = texto.lastIndexOf('}');

        if (inicio !== -1 && fin !== -1) {
          const soloJSON = texto.substring(inicio, fin + 1);
          try {
            this.resultado = JSON.parse(soloJSON);
          } catch (e) {
            this.resultado = null;
            console.error('Error al parsear JSON:', e);
          }
        } else {
          this.resultado = null;
          console.error('No se encontró JSON');
        }

      },
      error: (err) => {
        this.cargando = false;
        this.msg = 'Error al procesar la imagen.';
        console.error(err);
      }
    });
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  convertToDecimal(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const sanitized = value.replace(',', '.');
      const parsed = parseFloat(sanitized);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}
