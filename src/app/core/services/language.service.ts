import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const LS_KEY = 'lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  constructor(private t: TranslateService) {
    const saved = localStorage.getItem(LS_KEY);
    const lang = saved || this.detect();
    this.use(lang);
  }

  use(lang: string) {
    this.t.addLangs(['es', 'en']);
    this.t.setDefaultLang('es');
    this.t.use(lang);
    localStorage.setItem(LS_KEY, lang);
  }

  current() { return this.t.currentLang || 'es'; }

  private detect(): string {
    const nav = navigator.language?.toLowerCase() || 'es';
    return nav.startsWith('en') ? 'en' : 'es';
  }
}