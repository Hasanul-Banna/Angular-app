import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password-page',
  imports: [MatButtonModule, TranslatePipe],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordPage {
  readonly requestSubmitted = signal(false);

  submitResetRequest(event: Event): void {
    event.preventDefault();
    this.requestSubmitted.set(true);
  }
}
