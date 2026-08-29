import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { type ThemePreference, ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  imports: [TranslatePipe],
  templateUrl: './theme-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './theme-switcher.scss',
})
export class ThemeSwitcher {
  private readonly themeService = inject(ThemeService);

  readonly activeTheme = computed<'light' | 'dark'>(() => {
    const preference = this.themeService.preference();

    if (preference === 'system') {
      return this.themeService.resolvedTheme();
    }

    return preference;
  });

  setTheme(preference: Extract<ThemePreference, 'light' | 'dark'>): void {
    this.themeService.setPreference(preference);
  }

  toggleTheme(): void {
    this.setTheme(this.activeTheme() === 'light' ? 'dark' : 'light');
  }
}
