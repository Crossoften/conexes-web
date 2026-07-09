import { Routes } from '@angular/router';
import { WorkPlansPage } from './work-plans.page';
import { WorkPlanNewPage } from './new/work-plan-new.page';

export const workPlansRoutes: Routes = [
  {
    path: '',
    component: WorkPlansPage
  },
  {
    path: 'new',
    component: WorkPlanNewPage
  }
];
