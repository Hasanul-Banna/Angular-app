import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  type ApplicationConfig,
  ENVIRONMENT_INITIALIZER,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DEFAULT_APP_LANGUAGE, provideAppStore } from '@core/store';
import {
  provideTranslateLoader,
  provideTranslateService,
} from '@ngx-translate/core';
import { AppLanguageService } from './core/services/app-language.service';
import { ModuleTranslateLoader } from './core/services/module-translate.loader';
import { RouteTranslateLoaderService } from './core/services/route-translate-loader.service';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideAppStore(),
    provideTranslateService({
      lang: DEFAULT_APP_LANGUAGE,
      fallbackLang: DEFAULT_APP_LANGUAGE,
      loader: provideTranslateLoader(ModuleTranslateLoader),
    }),
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => inject(AppLanguageService),
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => inject(RouteTranslateLoaderService),
    },
  ],
};
