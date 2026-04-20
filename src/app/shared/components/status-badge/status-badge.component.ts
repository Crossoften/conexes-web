import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusType, STATUS_MAP } from '../../models/status.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: StatusType;

  ui = computed(() => {
    return STATUS_MAP[this.status] ?? {
      label: this.status,
      class: 'status--default',
    };
  });
}