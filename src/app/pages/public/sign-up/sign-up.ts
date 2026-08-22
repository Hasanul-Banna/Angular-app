import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sign-up-page',
  imports: [RouterLink, MatButtonModule, TranslatePipe],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUpPage {}
