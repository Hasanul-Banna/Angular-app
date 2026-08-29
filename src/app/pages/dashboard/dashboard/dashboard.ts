import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-page',
  imports: [TranslatePipe],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dashboard.scss',
})
export class DashboardPage {
  readonly cards = [
    { key: 'DASHBOARD_CARD_ACTIVE_ACCOUNTS', value: '1,284', trend: '+8.3%' },
    { key: 'DASHBOARD_CARD_MONTHLY_REVENUE', value: '$96,240', trend: '+14.1%' },
    { key: 'DASHBOARD_CARD_OPEN_TICKETS', value: '27', trend: '-5.6%' },
    { key: 'DASHBOARD_CARD_UPTIME', value: '99.95%', trend: '+0.2%' },
  ];
}
