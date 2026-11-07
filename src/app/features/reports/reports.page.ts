// src/app/features/reports/reports.page.ts
//
// Card #720 (FN-08): Central de Relatórios. HI-07 tirou os relatórios de dentro dos módulos
// para concentrá-los numa central — mas a central não existia e as rotas antigas davam 404.
// Aqui ficam os relatórios padrão já construídos (Financeiro e Compras), um por aba; a aba só
// aparece para quem tem acesso ao módulo. Geração personalizada não faz parte desta entrega.
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionsService } from '../../core/auth/permissions.service';
import { FinancialReportsPage } from '../financial-reports/financial-reports.page';
import { PurchasingReportsPage } from '../purchasing-reports/purchasing-reports.page';

type Aba = 'financeiro' | 'compras';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FinancialReportsPage, PurchasingReportsPage],
  template: `
    <div class="reports">
      <header class="reports__header">
        <h1 class="reports__title">Central de Relatórios</h1>
        <p class="reports__subtitle">Relatórios padrão do sistema, por módulo.</p>
      </header>
      @if (abas().length) {
        <nav class="reports__tabs" role="tablist">
          @for (a of abas(); track a.id) {
            <button type="button" role="tab" class="reports__tab" [class.reports__tab--active]="aba() === a.id"
                    [attr.aria-selected]="aba() === a.id" (click)="abrir(a.id)">{{ a.label }}</button>
          }
        </nav>
        @if (aba() === 'financeiro') { <app-financial-reports /> }
        @if (aba() === 'compras') { <app-purchasing-reports /> }
      } @else {
        <p class="reports__empty">Seu perfil não tem acesso a nenhum relatório (Financeiro ou Compras).</p>
      }
    </div>
  `,
  styles: [`
    .reports { display: flex; flex-direction: column; gap: 16px; }
    .reports__title { margin: 0; font-size: 22px; font-weight: 700; color: var(--brand-dark, #1E1B4B); }
    .reports__subtitle { margin: 4px 0 0; color: #6B7280; font-size: 14px; }
    .reports__tabs { display: flex; gap: 8px; border-bottom: 1px solid #E5E7EB; }
    .reports__tab { background: none; border: 0; padding: 10px 16px; font-size: 14px; font-weight: 600; color: #6B7280;
                    border-bottom: 2px solid transparent; cursor: pointer; }
    .reports__tab--active { color: #7C3AED; border-bottom-color: #7C3AED; }
    .reports__empty { color: #6B7280; }
  `],
})
export class ReportsPage {
  private perms = inject(PermissionsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly abas = computed(() => [
    ...(this.perms.canView('Financeiro') ? [{ id: 'financeiro' as Aba, label: 'Financeiro' }] : []),
    ...(this.perms.canView('Compras') ? [{ id: 'compras' as Aba, label: 'Compras' }] : []),
  ]);

  readonly aba = signal<Aba>('financeiro');

  constructor() {
    const pedida = this.route.snapshot.queryParamMap.get('aba') as Aba | null;
    const disponiveis = this.abas().map(a => a.id);
    this.aba.set(pedida && disponiveis.includes(pedida) ? pedida : (disponiveis[0] ?? 'financeiro'));
  }

  abrir(a: Aba): void {
    this.aba.set(a);
    this.router.navigate([], { queryParams: { aba: a }, replaceUrl: true });
  }
}
