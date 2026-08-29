import { Component, ElementRef, HostListener, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { APP_LANGUAGES, type AppLanguage, AppLanguageActions, selectAppLanguage } from '@core/store';

@Component({
  selector: 'app-lang-switcher',
  imports: [],
  templateUrl: './lang-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './lang-switcher.scss',
})
export class LangSwitcher {
  private readonly store = inject(Store);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly supportedLanguages = APP_LANGUAGES;
  readonly currentLanguage = this.store.selectSignal(selectAppLanguage);

  readonly selectedLanguageLabel = computed(() => this.currentLanguage().toUpperCase());

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const details = this.elementRef.nativeElement.querySelector('details');

    if (!details?.open) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(event.target)) {
      details.removeAttribute('open');
    }
  }

  setLanguage(language: AppLanguage): void {
    this.store.dispatch(AppLanguageActions.setAppLanguage({ language }));
  }

  getLanguageLabel(language: AppLanguage): string {
    return language === 'bn' ? 'বাংলা' : 'English';
  }
}
