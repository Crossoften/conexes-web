// src/app/features/general-settings/general-settings.page.ts
//
// TR-08: Configurações Gerais.
//
// O critério (reteste 19/10, pág. 3) diz: "Em Configurações Gerais, o usuário
// escolhe como o campo descrição é preenchido". A entrega anterior pôs a escolha
// dentro do formulário de cada transferência, porque esta tela estava "Em breve"
// no menu — o que não atende: é uma regra da organização, não uma decisão
// repetida a cada lançamento.
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/services/notification.service';

interface Configuracoes {
  entityId: number;
  organizacao: string;
  transferDescriptionMode: string;
  opcoesDescricao: { valor: string; rotulo: string }[];
}

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Configurações gerais</h1>
      </div>

      @if (erro()) { <div class="error-banner" role="alert">{{ erro() }}</div> }

      @if (cfg(); as c) {
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Transferências</h2>
            <p class="card-subtitle">Vale para {{ c.organizacao }} e para todas as transferências lançadas.</p>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Descrição da transferência</label>
              <div class="select-wrap">
                <select class="form-control" [(ngModel)]="modo">
                  @for (o of c.opcoesDescricao; track o.valor) { <option [value]="o.valor">{{ o.rotulo }}</option> }
                </select>
                <svg class="select-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <small class="hint">
                Em <strong>Manual</strong>, o campo abre em branco para quem lança escrever.
                Em <strong>Automática</strong>, o sistema compõe
                <code>Transferência Entre Contas - [origem] &gt; [destino]</code>.
              </small>
            </div>
          </div>
          <div class="card-footer">
            <button type="button" class="btn-solid btn-solid--orange" [disabled]="salvando()" (click)="salvar()">
              {{ salvando() ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </div>

        <!-- COM-Captura / I031 (decisão D3): certificado e captura de notas são
             configurados UMA VEZ, aqui no cadastro da organização. Antes o botão de
             habilitar a captura ficava na tela de Notas fiscais, dando a entender
             que era ajuste daquele módulo — e Pedido, recebimento e Financeiro
             precisam consultar a MESMA origem. -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Documentos fiscais</h2>
            <p class="card-subtitle">Vale para {{ c.organizacao }}. Pedido, recebimento e Financeiro consultam esta mesma configuração.</p>
          </div>
          <div class="card-body">
            <p class="hint">
              A captura de NFS-e recebidas é habilitada uma única vez para o CNPJ da organização.
              Depois disso, a sincronização das notas é feita por período em
              <strong>Financeiro › Notas fiscais e cobranças</strong>.
            </p>
            @if (capturaMsg()) { <div class="hint" [class.erro]="capturaErro()">{{ capturaMsg() }}</div> }
          </div>
          <div class="card-footer">
            <button type="button" class="btn-solid btn-solid--orange" [disabled]="habilitando()" (click)="habilitarCaptura()">
              {{ habilitando() ? 'Habilitando…' : 'Habilitar captura de NFS-e' }}
            </button>
          </div>
        </div>
      } @else {
        <div class="card"><div class="card-body"><p class="muted">Carregando…</p></div></div>
      }
    </div>
  `,
  styles: [`
    .card { background:#fff; border:1px solid var(--surface-border,#E5E7EB); border-radius:12px; margin-bottom:16px; }
    .card-header { padding:18px 22px; border-bottom:1px solid var(--surface-border,#E5E7EB); }
    .card-title { margin:0; font-size:17px; font-weight:700; }
    .card-subtitle { margin:4px 0 0; font-size:13px; color:var(--text-secondary,#6B7280); }
    .card-body { padding:22px; }
    .card-footer { padding:16px 22px; border-top:1px solid var(--surface-border,#E5E7EB); display:flex; justify-content:flex-end; background:#FAFAFE; border-radius:0 0 12px 12px; }
    .form-group { max-width:620px; }
    label { display:block; font-size:13px; font-weight:600; margin-bottom:6px; }
    .select-wrap { position:relative; }
    .form-control { width:100%; padding:10px 12px; border:1px solid var(--surface-border,#E5E7EB); border-radius:10px; font:inherit; appearance:none; }
    .select-chevron { position:absolute; right:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; pointer-events:none; color:#6B7280; }
    .hint { display:block; margin-top:8px; font-size:12.5px; color:var(--text-secondary,#6B7280); line-height:1.5; }
    code { background:#F3F4F6; padding:1px 5px; border-radius:4px; font-size:12px; }
    .error-banner { background:#FEF2F2; border:1.5px solid #FECACA; color:#B91C1C; padding:12px 16px; border-radius:10px; margin-bottom:14px; }
    .hint.erro { color:#B91C1C; }
    .btn-solid--orange { background:var(--brand-orange,#F97316); color:#fff; border:none; border-radius:10px; padding:10px 20px; font-weight:600; cursor:pointer; }
    .muted { color:var(--text-muted,#9CA3AF); }
  `],
})
export class GeneralSettingsPage {
  private http = inject(HttpClient);
  private notify = inject(NotificationService);
  private base = `${environment.apiUrl}/v1/general-settings`;

  readonly cfg = signal<Configuracoes | null>(null);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  modo = 'Manual';

  // ── COM-Captura / I031 (D3): a captura de notas é configurada AQUI, uma vez ──
  readonly habilitando = signal(false);
  readonly capturaMsg = signal<string | null>(null);
  readonly capturaErro = signal(false);

  habilitarCaptura(): void {
    this.habilitando.set(true);
    this.capturaMsg.set(null);
    this.capturaErro.set(false);
    this.http.post(`${environment.apiUrl}/v1/integrations/nfeio/inbound/nfse/enable`, { initialNsu: 0 }).subscribe({
      next: () => {
        this.habilitando.set(false);
        this.capturaErro.set(false);
        this.capturaMsg.set('Captura de NFS-e habilitada para o CNPJ da organização.');
        this.notify.success('Captura de NFS-e habilitada.');
      },
      error: e => {
        this.habilitando.set(false);
        this.capturaErro.set(true);
        // A mensagem do provedor é o que diz se falta certificado/credencial — mostre-a.
        const m = e?.error?.message;
        this.capturaMsg.set(Array.isArray(m) ? m.join('; ') : (m ?? 'Não foi possível habilitar a captura.'));
      },
    });
  }

  constructor() { this.carregar(); }

  private carregar(): void {
    this.http.get<Configuracoes>(this.base).subscribe({
      next: c => { this.cfg.set(c); this.modo = c.transferDescriptionMode || 'Manual'; },
      error: e => this.erro.set(e?.error?.message ?? 'Não foi possível carregar as configurações.'),
    });
  }

  salvar(): void {
    this.salvando.set(true);
    this.erro.set(null);
    this.http.patch<Configuracoes>(this.base, { transferDescriptionMode: this.modo }).subscribe({
      next: c => {
        this.salvando.set(false);
        this.cfg.set(c);
        this.notify.success('Configurações salvas.');
      },
      error: e => {
        this.salvando.set(false);
        this.erro.set(e?.error?.message ?? 'Não foi possível salvar.');
      },
    });
  }
}
