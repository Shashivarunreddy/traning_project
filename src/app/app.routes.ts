import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { Notfound404Component } from '../ui/notfound404/notfound404.component';
import { LandingpageComponent } from '../components/landingpage/landingpage.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingpageComponent,
  },

  {
    path: 'signin',
    loadComponent: () =>
      import('../components/signin/signin.component').then(
        (m) => m.SigninComponent
      ),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('../components/signup/signup.component').then(
        (m) => m.SignupComponent
      ),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('../roles/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'employee',
    loadChildren: () =>
      import('../roles/employee/employee.routes').then((m) => m.emproutes),
  },
  {
    path: 'employee',
    loadComponent: () =>
      import('../roles/employee/employee.component').then(
        (m) => m.EmployeeComponent
      ),
  },
  {
    path: 'manager',
    loadComponent: () =>
      import('../roles/manager/manager.component').then(
        (m) => m.ManagerComponent
      ),
  },

  { path: '**', component: Notfound404Component },
];
