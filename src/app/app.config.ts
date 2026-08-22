import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAppStore } from '@core/store';
import { AppLanguageService } from './core/services/app-language.service';
import { provideAppTranslateService } from './core/services/module-translate.loader';
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
    provideAppTranslateService(),
    provideEnvironmentInitializer(() => {
      inject(AppLanguageService);
    }),
    provideEnvironmentInitializer(() => {
      inject(RouteTranslateLoaderService);
    }),
  ],
};
