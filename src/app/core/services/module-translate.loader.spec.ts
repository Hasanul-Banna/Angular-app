import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { GLOBAL_I18N_MODULE, provideAppTranslateService } from './module-translate.loader';

describe('app translate wiring', () => {
  let translateService: TranslateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideAppTranslateService()],
    });

    translateService = TestBed.inject(TranslateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // Reproduces the bootstrap race: `RouteTranslateLoaderService` merges a route
  // module in while the global loader request is still in flight. When that
  // response lands it must not discard the merged module.
  it('keeps route-module translations when the global loader response arrives later', () => {
    translateService.use('en');

    const request = httpMock.expectOne(`/i18n/${GLOBAL_I18N_MODULE}/en.json`);

    // Route loader merges the `public` module before the global load settles.
    translateService.setTranslation('en', { NAV_HOME: 'Home' }, true);
    expect(translateService.instant('NAV_HOME')).toBe('Home');

    request.flush({ language: { label: 'Language' } });

    expect(translateService.instant('NAV_HOME')).toBe('Home');
  });
});
