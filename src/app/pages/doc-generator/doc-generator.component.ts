import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-doc-generator',
  imports: [ButtonModule],
  templateUrl: './doc-generator.component.html',
  styleUrl: './doc-generator.component.scss'
})
export class DocGeneratorComponent {
  generar(tipo: string) {
    // Aquí puedes implementar la lógica para generar el documento según el tipo seleccionado
    console.log(`Generando documento de tipo: ${tipo}`);
    // Lógica para generar el documento...
  }
}
