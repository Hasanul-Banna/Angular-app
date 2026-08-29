import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sign-up-page',
  imports: [RouterLink, MatButtonModule, TranslatePipe],
  templateUrl: './sign-up.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './sign-up.scss',
})
export class SignUpPage {}
