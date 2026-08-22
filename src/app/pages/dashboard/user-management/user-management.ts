import { Component } from '@angular/core';
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
  styleUrl: './user-management.scss',
})
export class UserManagementPage {
  readonly users: UserRow[] = [
    {
      name: 'Ayesha Rahman',
      email: 'ayesha.rahman@acmehub.com',
      role: 'Admin',
      status: 'Active',
    },
    {
      name: 'Rafiul Karim',
      email: 'rafiul.karim@acmehub.com',
      role: 'Manager',
      status: 'Pending',
    },
    {
      name: 'Nusrat Jahan',
      email: 'nusrat.jahan@acmehub.com',
      role: 'Support',
      status: 'Suspended',
    },
    {
      name: 'Tanvir Hossain',
      email: 'tanvir.hossain@acmehub.com',
      role: 'Analyst',
      status: 'Active',
    },
  ];
}
