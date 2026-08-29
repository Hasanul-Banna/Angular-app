import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LangSwitcher } from '../../shared/components/lang-switcher/lang-switcher';
import { ThemeSwitcher } from '../../shared/components/theme-switcher/theme-switcher';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, TranslatePipe, LangSwitcher, ThemeSwitcher],
  templateUrl: './public-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  readonly mobileMenuOpen = signal(false);

  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleMenu(): void {
    this.mobileMenuOpen.update((isOpen) => !isOpen);
  }
}
