// src/app/features/stakeholders/stakeholder-detail.page.ts
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-stakeholder-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="placeholder">
      <a class="back" routerLink="/stakeholders">← Voltar</a>
      <h2>Detalhe — ID: {{ id }}</h2>
      <p>Tela em desenvolvimento</p>
    </div>
  `,
  styles: [`
    .placeholder { padding: 32px; }
    .back { display: inline-block; margin-bottom: 16px; color: #7C3AED; font-weight: 600; text-decoration: none; }
    h2 { font-family: 'Sora', sans-serif; color: #1E1B4B; margin-bottom: 8px; font-size: 18px; }
    p  { color: #9CA3AF; font-size: 13px; }
  `],
})
export class StakeholderDetailPage {
  id = inject(ActivatedRoute).snapshot.paramMap.get('id');
}
