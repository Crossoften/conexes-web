// src/app/features/employees/employees.routes.ts
import { Routes } from '@angular/router';
import { EmployeesListPage } from './employees-list.page';
import { EmployeeNewPage } from './new/employee-new.page';

export const employeesRoutes: Routes = [
  {
    path: '',
    component: EmployeesListPage
  },
  {
    path: 'new',
    component: EmployeeNewPage
  }
];