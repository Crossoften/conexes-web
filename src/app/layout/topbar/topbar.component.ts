// src/app/layout/topbar/topbar.component.ts
import { Component, input, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  parentLabel  = input<string | null>(null);
  currentLabel = input<string>('');

  readonly auth = inject(AuthService);
}
