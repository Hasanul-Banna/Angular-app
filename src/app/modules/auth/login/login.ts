import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export const LOGIN_I18N_MODULES = ['auth'];

@Component({
  selector: 'app-login',
  imports: [TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  static i18nModules = LOGIN_I18N_MODULES;
}
