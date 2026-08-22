import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, MatButtonModule, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {}
