// src/app/features/accounts-receivable/new/accounts-receivable-new.page.ts
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';
import { FinancialTitleFormComponent } from '../../accounts-payable/form/financial-title-form.component';

/**
 * Card #768 (item 58): o formulário de Contas a receber passa a ser o mesmo de
 * Contas a pagar (pesquisa com cadastro, classificação em linha, parcelamento,
 * impostos com código e edição manual, anexos e Reiniciar), com os termos de receita.
 */
@Component({
  selector: 'app-accounts-receivable-new',
  standalone: true,
  imports: [FinancialTitleFormComponent],
  template: `
    <div class="page">
      <div class="page-header"><h1 class="page-title">{{ editId ? 'Editar conta a receber' : 'Nova conta a receber' }}</h1></div>
      <app-financial-title-form kind="receber" [editId]="editId" [doExtrato]="doExtrato" (saved)="aoSalvar($event)" (cancelled)="voltar()"></app-financial-title-form>
    </div>
  `,
  styles: [`.page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin: 0 0 18px; }`],
})
export class AccountsReceivableNewPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private notify = inject(NotificationService);

  readonly editId = Number(this.route.snapshot.paramMap.get('id')) || null;
  /** Card #768 (item 39): aberto pela seta para cima de um crédito da conciliação. */
  readonly doExtrato = (history.state && history.state.doExtrato) || null;

  aoSalvar(salvo: any): void {
    this.notify.success(this.editId ? 'Conta a receber atualizada com sucesso.' : 'Conta a receber cadastrada com sucesso.');
    const ext = this.doExtrato;
    if (!this.editId && ext && salvo?.id) {
      this.http.patch(`${environment.apiUrl}/v1/banking/reconciliation/${ext.txId}/match`, { accountReceivableId: salvo.id }).subscribe({
        next: () => { this.notify.success('Movimento do extrato conciliado com a conta a receber.'); this.router.navigate(['/bank-reconciliation']); },
        error: () => { this.notify.error('Conta a receber salva, mas não foi possível conciliar o movimento do extrato.'); this.router.navigate(['/bank-reconciliation']); },
      });
      return;
    }
    this.router.navigate(['/accounts-receivable']);
  }

  voltar(): void {
    this.router.navigate([this.doExtrato ? '/bank-reconciliation' : '/accounts-receivable']);
  }
}
