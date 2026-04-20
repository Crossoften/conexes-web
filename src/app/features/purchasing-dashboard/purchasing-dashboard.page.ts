// src/app/features/purchasing-dashboard/purchasing-dashboard.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DASHBOARD_METRICS,
  RECENT_REQUISITIONS,
  STATUS_DISTRIBUTION,
  PENDING_COUNT,
} from './purchasing-dashboard.mock';
import { REQUISITION_STATUS_LABELS, REQUISITION_STATUS_COLORS } from './purchasing-dashboard.model';

@Component({
  selector: 'app-purchasing-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './purchasing-dashboard.page.html',
  styleUrl: './purchasing-dashboard.page.scss',
})
export class PurchasingDashboardPage {
  readonly metrics      = DASHBOARD_METRICS;
  readonly requisitions = RECENT_REQUISITIONS;
  readonly distribution = STATUS_DISTRIBUTION;
  readonly pendingCount = PENDING_COUNT;
  readonly statusLabels = REQUISITION_STATUS_LABELS;
  readonly statusColors = REQUISITION_STATUS_COLORS;

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getBarWidth(count: number, total: number): string {
    return `${Math.round((count / total) * 100)}%`;
  }
}
