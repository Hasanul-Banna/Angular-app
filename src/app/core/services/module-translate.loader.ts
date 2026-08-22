import { type HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { type TranslateLoader, type TranslationObject } from '@ngx-translate/core';
import { type Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const GLOBAL_I18N_MODULE = 'generic-app';

@Injectable()
export class ModuleTranslateLoader implements TranslateLoader {
  constructor(
    private readonly httpClient: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  getTranslation(language: string): Observable<TranslationObject> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({});
    }

    return this.httpClient
      .get<TranslationObject>(`/i18n/${GLOBAL_I18N_MODULE}/${language}.json`)
      .pipe(catchError(() => of({})));
  }
}
