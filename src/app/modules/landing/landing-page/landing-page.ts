import { Component, ChangeDetectionStrategy } from '@angular/core';

export const LANDING_I18N_MODULES = ['landing'];

@Component({
  selector: 'app-landing-page',
  imports: [],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  static i18nModules = LANDING_I18N_MODULES;
}
