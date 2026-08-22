import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { type ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslateService, type TranslationObject } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';

import { GLOBAL_I18N_MODULE } from './module-translate.loader';

export const I18N_ROUTE_DATA_KEY = 'i18nModules';

@Injectable({ providedIn: 'root' })
export class RouteTranslateLoaderService {
  private readonly loadedModulesByLanguage = new Map<string, Set<string>>();

  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.preloadForActiveRoute());

    this.translateService.onLangChange.subscribe(({ lang }) => {
      this.preloadForActiveRoute(lang);
    });

    this.preloadForActiveRoute();
  }

  private preloadForActiveRoute(language?: string): void {
    const selectedLanguage =
      language ||
      this.translateService.currentLang ||
      this.translateService.getFallbackLang();

    if (!selectedLanguage) {
      return;
    }

    const modules = this.collectActiveRouteModules(this.router.routerState.snapshot.root);
    const loadedModules = this.getLoadedModules(selectedLanguage);
    const modulesToLoad = modules.filter((moduleName) => !loadedModules.has(moduleName));

    if (modulesToLoad.length === 0) {
      return;
    }

    const requests = modulesToLoad.map((moduleName) =>
      this.httpClient
        .get<TranslationObject>(`/i18n/${moduleName}/${selectedLanguage}.json`)
        .pipe(catchError(() => of({})))
    );

    forkJoin(requests).subscribe((translations) => {
      translations.forEach((translation, index) => {
        this.translateService.setTranslation(selectedLanguage, translation, true);
        loadedModules.add(modulesToLoad[index]);
      });
    });
  }

  private collectActiveRouteModules(root: ActivatedRouteSnapshot): string[] {
    const modules = new Set<string>([GLOBAL_I18N_MODULE]);
    let current: ActivatedRouteSnapshot | null = root;

    while (current) {
      // Check route data first
      const routeModules = current.data[I18N_ROUTE_DATA_KEY] as string[] | undefined;

      if (routeModules) {
        routeModules.forEach((moduleName) => modules.add(moduleName));
      }

      // Also check if the component has a static i18nModules property
      const component = current.component as any;
      if (component?.i18nModules && Array.isArray(component.i18nModules)) {
        component.i18nModules.forEach((moduleName: string) => modules.add(moduleName));
      }

      current = current.firstChild ?? null;
    }

    return [...modules];
  }

  private getLoadedModules(language: string): Set<string> {
    let modules = this.loadedModulesByLanguage.get(language);

    if (!modules) {
      modules = new Set<string>();
      this.loadedModulesByLanguage.set(language, modules);
    }

    return modules;
  }
}
