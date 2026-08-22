import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export const SIGNUP_I18N_MODULES = ['auth'];

@Component({
  selector: 'app-sign-up',
  imports: [TranslatePipe],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp {
  static i18nModules = SIGNUP_I18N_MODULES;
}
