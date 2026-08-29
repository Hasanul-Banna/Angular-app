import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

interface UserRow {
  name: string;
  email: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-user-management-page',
  imports: [MatButtonModule, TranslatePipe],
  templateUrl: './user-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './user-management.scss',
})
export class UserManagementPage {
  readonly users: UserRow[] = [
    {
      name: 'Ayesha Rahman',
      email: 'ayesha.rahman@AngularLT.com',
      role: 'Admin',
      status: 'Active',
    },
    {
      name: 'Rafiul Karim',
      email: 'rafiul.karim@AngularLT.com',
      role: 'Manager',
      status: 'Pending',
    },
    {
      name: 'Nusrat Jahan',
      email: 'nusrat.jahan@AngularLT.com',
      role: 'Support',
      status: 'Suspended',
    },
    {
      name: 'Tanvir Hossain',
      email: 'tanvir.hossain@AngularLT.com',
      role: 'Analyst',
      status: 'Active',
    },
  ];
}
