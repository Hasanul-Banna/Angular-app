import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { type Provider, Injectable, PLATFORM_ID, inject } from '@angular/core';
import {
  type TranslateLoader,
  type TranslationObject,
  provideTranslateLoader,
  provideTranslateService,
} from '@ngx-translate/core';
import { type Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DEFAULT_APP_LANGUAGE } from '../configs/app-languages.config';

export const GLOBAL_I18N_MODULE = 'generic-app';

@Injectable()
export class ModuleTranslateLoader implements TranslateLoader {
  private readonly httpClient = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  getTranslation(language: string): Observable<TranslationObject> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({});
    }

    return this.httpClient
      .get<TranslationObject>(`/i18n/${GLOBAL_I18N_MODULE}/${language}.json`)
      .pipe(catchError(() => of({})));
  }
}

/**
 * Single source of truth for the translate wiring, shared by `app.config.ts`
 * and its spec.
 */
export function provideAppTranslateService(): Provider[] {
  return [
    provideTranslateService({
      lang: DEFAULT_APP_LANGUAGE,
      fallbackLang: DEFAULT_APP_LANGUAGE,
      // Module translations are merged in per route by
      // `RouteTranslateLoaderService`. Without `extend`, a global loader
      // response replaces the whole language store and drops any module that
      // was merged in while it was still in flight.
      extend: true,
      loader: provideTranslateLoader(ModuleTranslateLoader),
    }),
  ] as Provider[];
}
