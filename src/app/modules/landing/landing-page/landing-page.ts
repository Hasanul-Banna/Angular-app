import { Component } from '@angular/core';

export const LANDING_I18N_MODULES = ['landing'];

@Component({
  selector: 'app-landing-page',
  imports: [],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  static i18nModules = LANDING_I18N_MODULES;
}
