// src/app/shared/components/process-chat/process-chat.component.ts
//
// Card #720 (CM-01, reunião 30/07): canal de comunicação interno POR PROCESSO. Fica dentro da
// requisição, da conta a pagar e da prestação de contas; só os envolvidos leem e escrevem
// (o back confere). Nada é editado nem apagado — é o registro de auditoria do processo.
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export type ProcessType = 'purchase_request' | 'account_payable' | 'accountability';

interface ProcessMessage {
  id: number;
  kind: 'message' | 'correction_request' | 'reply' | string;
  body: string;
  createdAt: string;
  author: { id: number; name: string; surname?: string | null; email?: string };
}

const KIND_LABEL: Record<string, string> = {
  message: 'Mensagem',
  correction_request: 'Pedido de correção',
  reply: 'Resposta',
};

@Component({
  selector: 'app-process-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="pchat" data-testid="process-chat">
      <header class="pchat__head">
        <h4 class="pchat__title">Comunicação do processo</h4>
        <span class="pchat__hint">Privado aos envolvidos · fica registrado e não pode ser editado nem apagado</span>
      </header>

      @if (erro()) { <div class="pchat__erro" role="alert">{{ erro() }}</div> }

      <div class="pchat__lista">
        @if (carregando()) {
          <p class="pchat__vazio">Carregando…</p>
        } @else {
          @for (m of mensagens(); track m.id) {
            <article class="pchat__msg" [class.pchat__msg--correcao]="m.kind === 'correction_request'">
              <div class="pchat__meta">
                <strong>{{ nome(m) }}</strong>
                <span class="pchat__tipo">{{ rotulo(m.kind) }}</span>
                <span class="pchat__data">{{ quando(m.createdAt) }}</span>
              </div>
              <p class="pchat__texto">{{ m.body }}</p>
            </article>
          } @empty {
            <p class="pchat__vazio">Nenhuma mensagem neste processo ainda.</p>
          }
        }
      </div>

      @if (!bloqueado()) {
        <form class="pchat__form" (ngSubmit)="enviar()">
          <select class="pchat__sel" name="kind" [(ngModel)]="tipo" aria-label="Tipo da mensagem">
            <option value="message">Mensagem</option>
            <option value="correction_request">Pedir correção</option>
            <option value="reply">Responder</option>
          </select>
          <textarea class="pchat__txt" name="body" rows="2" [(ngModel)]="texto" maxlength="5000"
                    placeholder="Escreva para os envolvidos neste processo…"></textarea>
          <button type="submit" class="btn-solid btn-solid--orange" [disabled]="enviando() || !texto.trim()">
            {{ enviando() ? 'Enviando…' : 'Enviar' }}
          </button>
        </form>
      }
    </section>
  `,
  styles: [`
    .pchat { border: 1px solid #E5E7EB; border-radius: 12px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
    .pchat__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; justify-content: space-between; }
    .pchat__title { margin: 0; font-size: 14px; font-weight: 700; color: #111827; }
    .pchat__hint { font-size: 12px; color: #6B7280; }
    .pchat__erro { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
    .pchat__lista { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow: auto; }
    .pchat__msg { border: 1px solid #EEF0F4; background: #F9FAFB; border-radius: 10px; padding: 8px 10px; }
    .pchat__msg--correcao { border-color: #FDE68A; background: #FFFBEB; }
    .pchat__meta { display: flex; gap: 8px; align-items: baseline; font-size: 12px; color: #374151; flex-wrap: wrap; }
    .pchat__tipo { background: #EDE9FE; color: #6D28D9; border-radius: 999px; padding: 1px 8px; font-size: 11px; }
    .pchat__msg--correcao .pchat__tipo { background: #FEF3C7; color: #92400E; }
    .pchat__data { color: #9CA3AF; margin-left: auto; }
    .pchat__texto { margin: 4px 0 0; font-size: 13.5px; color: #111827; white-space: pre-wrap; }
    .pchat__vazio { font-size: 13px; color: #6B7280; margin: 0; }
    .pchat__form { display: grid; grid-template-columns: 160px 1fr auto; gap: 8px; align-items: start; }
    .pchat__sel, .pchat__txt { border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: inherit; }
    .pchat__txt { resize: vertical; }
  `],
})
export class ProcessChatComponent implements OnChanges {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/process-messages`;

  @Input({ required: true }) processType!: ProcessType;
  @Input({ required: true }) processId!: number;

  readonly mensagens = signal<ProcessMessage[]>([]);
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly bloqueado = signal(false);
  tipo: 'message' | 'correction_request' | 'reply' = 'message';
  texto = '';

  ngOnChanges(): void {
    if (this.processType && this.processId) this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.http.get<ProcessMessage[]>(this.base, { params: { processType: this.processType, processId: String(this.processId) } }).subscribe({
      next: lista => { this.mensagens.set(lista ?? []); this.carregando.set(false); this.bloqueado.set(false); },
      error: e => {
        this.carregando.set(false);
        this.bloqueado.set(e?.status === 403);
        this.erro.set(e?.error?.message ?? 'Não foi possível carregar a comunicação do processo.');
      },
    });
  }

  enviar(): void {
    const body = this.texto.trim();
    if (!body) return;
    this.enviando.set(true);
    this.erro.set(null);
    this.http.post<ProcessMessage>(this.base, { processType: this.processType, processId: this.processId, kind: this.tipo, body }).subscribe({
      next: m => { this.mensagens.update(l => [...l, m]); this.texto = ''; this.tipo = 'message'; this.enviando.set(false); },
      error: e => { this.enviando.set(false); this.erro.set(e?.error?.message ?? 'Não foi possível enviar a mensagem.'); },
    });
  }

  nome(m: ProcessMessage): string { return [m.author?.name, m.author?.surname].filter(Boolean).join(' ') || 'Usuário'; }
  rotulo(k: string): string { return KIND_LABEL[k] ?? k; }
  quando(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}
