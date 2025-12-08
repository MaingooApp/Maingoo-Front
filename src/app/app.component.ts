import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';
import packageJson from '../../package.json';
import { LanguageService } from './core/services/language.service';
import { ChatBubbleComponent } from './shared/components/chat-bubble/chat-bubble.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, HttpClientModule, ConfirmDialogModule, ToastModule, DynamicDialogModule, ChatBubbleComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(
    private lang: LanguageService,
    private t: TranslateService
  ) {
    console.warn('Version:', packageJson.version);
  }
  get cur() {
    return this.lang.current();
  }
  set(code: 'es' | 'en') {
    this.lang.use(code);
  }
}
