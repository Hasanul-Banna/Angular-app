import { DestroyRef, Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const THEME_PREFERENCE_STORAGE_KEY = 'app-theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private mediaQueryList: MediaQueryList | null = null;

  readonly preference = signal<ThemePreference>('system');
  readonly resolvedTheme = signal<ResolvedTheme>('light');

  constructor() {
    this.restorePreference();

    if (this.isBrowser) {
      this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      const onSystemThemeChanged = () => {
        if (this.preference() === 'system') {
          this.syncResolvedTheme();
        }
      };

      this.mediaQueryList.addEventListener('change', onSystemThemeChanged);
      this.destroyRef.onDestroy(() => {
        this.mediaQueryList?.removeEventListener('change', onSystemThemeChanged);
      });
    }

    effect(() => {
      const selectedPreference = this.preference();
      this.persistPreference(selectedPreference);
      this.syncResolvedTheme();
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
  }

  private syncResolvedTheme(): void {
    const resolvedTheme = this.resolveTheme(this.preference());
    this.resolvedTheme.set(resolvedTheme);
    this.applyResolvedTheme(resolvedTheme);
  }

  private resolveTheme(preference: ThemePreference): ResolvedTheme {
    if (preference === 'light' || preference === 'dark') {
      return preference;
    }

    return this.mediaQueryList?.matches ? 'dark' : 'light';
  }

  private applyResolvedTheme(theme: ResolvedTheme): void {
    const root = this.document.documentElement;
    const body = this.document.body;

    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    if (body) {
      body.setAttribute('data-theme', theme);
      body.classList.toggle('dark', theme === 'dark');
      body.style.colorScheme = theme;
    }
  }

  private restorePreference(): void {
    if (!this.isBrowser) {
      return;
    }

    const savedPreference = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);

    if (savedPreference === 'system' || savedPreference === 'light' || savedPreference === 'dark') {
      this.preference.set(savedPreference);
    }
  }

  private persistPreference(preference: ThemePreference): void {
    if (!this.isBrowser) {
      return;
    }

    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  }
}
