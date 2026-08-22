import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import {
  APP_LANGUAGES,
  type AppLanguage,
  DEFAULT_APP_LANGUAGE,
} from '../configs/app-languages.config';
import { selectAppLanguage } from '../store';

@Injectable({ providedIn: 'root' })
export class AppLanguageService {
  private readonly store = inject(Store);
  private readonly translateService = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly selectedLanguage = this.store.selectSignal(selectAppLanguage);

  constructor() {
    this.translateService.addLangs(APP_LANGUAGES.map((language) => language.code));
    this.translateService.setFallbackLang(DEFAULT_APP_LANGUAGE);

    // Keep translation language strictly in sync with global store state.
    effect(() => {
      const language: AppLanguage = this.selectedLanguage();

      this.document.documentElement.lang = language;

      if (isPlatformBrowser(this.platformId)) {
        this.document.body.setAttribute('lang', language);
      }

      this.translateService.use(language);
    });
  }
}
