import { type Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout').then(
        (m) => m.PublicLayout,
      ),
    data: {
      i18nModules: ['public'],
    },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/public/home/home').then((m) => m.HomePage),
      },
      {
        path: 'home',
        redirectTo: '',
        pathMatch: 'full',
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./pages/public/about/about').then((m) => m.AboutPage),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/public/login/login').then((m) => m.LoginPage),
      },
      {
        path: 'sign-up',
        loadComponent: () =>
          import('./pages/public/sign-up/sign-up').then((m) => m.SignUpPage),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/public/forgot-password/forgot-password').then(
            (m) => m.ForgotPasswordPage,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout').then(
        (m) => m.DashboardLayout,
      ),
    data: {
      i18nModules: ['dashboard'],
    },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard/dashboard').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/dashboard/user-management/user-management').then(
            (m) => m.UserManagementPage,
          ),
      },
    ],
  },
  {
    path: 'auth',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
