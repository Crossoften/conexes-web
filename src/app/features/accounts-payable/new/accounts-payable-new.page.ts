// src/app/features/accounts-payable/new/accounts-payable-new.page.ts
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';
import { FinancialTitleFormComponent } from '../form/financial-title-form.component';

/**
 * Card #768 (itens 47, 53 e 54): a página de nova/editar conta a pagar usa o
 * formulário unificado (o mesmo do pop-up da lista e de Contas a receber).
 */
@Component({
  selector: 'app-accounts-payable-new',
  standalone: true,
  imports: [FinancialTitleFormComponent],
  template: `
    <div class="page">
      <div class="page-header"><h1 class="page-title">{{ editId ? 'Editar conta a pagar' : 'Nova conta a pagar' }}</h1></div>
      <app-financial-title-form kind="pagar" [editId]="editId" [doExtrato]="doExtrato" (saved)="aoSalvar($event)" (cancelled)="voltar()"></app-financial-title-form>
    </div>
  `,
  styles: [`.page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin: 0 0 18px; }`],
})
export class AccountsPayableNewPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private notify = inject(NotificationService);

  readonly editId = Number(this.route.snapshot.paramMap.get('id')) || null;
  /** Card #768 (item 39): aberto pela seta para baixo de um débito da conciliação. */
  readonly doExtrato = (history.state && history.state.doExtrato) || null;

  aoSalvar(salvo: any): void {
    this.notify.success(this.editId ? 'Conta a pagar atualizada.' : 'Conta a pagar cadastrada com sucesso.');
    const ext = this.doExtrato;
    if (!this.editId && ext && salvo?.id) {
      // a linha do extrato fica conciliada com o título recém-criado
      this.http.patch(`${environment.apiUrl}/v1/banking/reconciliation/${ext.txId}/match`, { accountPayableId: salvo.id }).subscribe({
        next: () => { this.notify.success('Movimento do extrato conciliado com a conta a pagar.'); this.router.navigate(['/bank-reconciliation']); },
        error: () => { this.notify.error('Conta a pagar salva, mas não foi possível conciliar o movimento do extrato.'); this.router.navigate(['/bank-reconciliation']); },
      });
      return;
    }
    this.router.navigate(['/accounts-payable']);
  }

  voltar(): void {
    this.router.navigate([this.doExtrato ? '/bank-reconciliation' : '/accounts-payable']);
  }
}
