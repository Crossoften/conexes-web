// src/app/features/quotation-map/quotation-map.page.ts
// Feature 3 (front): Mapa de Cotação — comparar propostas + gerar convites do Portal.
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Req { id: number; title: string; }
interface Supp { id: number; name: string; }
/** I023: um convite já gerado, com o resultado do envio. */
interface Invite {
  id: number; supplierId: number; supplierName: string;
  email: string | null; status: string; link: string;
  createdAt?: string; answeredAt?: string | null;
  enviado?: boolean; motivo?: string;
}

@Component({
  selector: 'app-quotation-map',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './quotation-map.page.html',
  styleUrl: './quotation-map.page.scss',
})
export class QuotationMapPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  /**
   * COMP-21: quando o mapa é aberto de dentro da Etapa 4, a requisição vem na
   * rota. Nesse caso o seletor "Selecione uma requisição" não aparece — escolher
   * de novo o que já se estava olhando é o que fazia dele um módulo à parte.
   */
  readonly fixedRequestId = Number(this.route.snapshot.paramMap.get('requestId')) || null;
  readonly fromStage      = this.fixedRequestId != null;
  private api = environment.apiUrl + '/v1';
  // I023: o endereço do Portal saiu daqui. Quem monta o link é o servidor
  // (PORTAL_COTACAO_URL), que é também quem manda o e-mail — com o endereço nos dois
  // lados, o link copiado na tela e o link enviado podiam divergir.

  readonly requests = signal<Req[]>([]);
  readonly suppliers = signal<Supp[]>([]);
  readonly selectedRequestId = signal<number | null>(null);
  readonly map = signal<any | null>(null);
  readonly selectedSuppliers = signal<Set<number>>(new Set());
  readonly loadingMap = signal(false);
  readonly generating = signal(false);
  readonly copied = signal<string | null>(null);

  /**
   * I023: os convites JÁ GERADOS da requisição. Antes a lista só existia em
   * memória logo depois de gerar: sair da tela perdia os links, e não havia como
   * copiar de novo nem reenviar sem gerar tudo outra vez.
   */
  readonly invites = signal<Invite[]>([]);
  readonly reenviando = signal<number | null>(null);
  readonly aviso = signal<string | null>(null);

  /**
   * I023: com a requisição fixa, os convidados são os FORNECEDORES SUGERIDOS dela —
   * era a lista inteira de fornecedores do cadastro, ignorando quem a requisição
   * tinha indicado. Sem sugeridos, cai no cadastro completo para não travar a tela.
   */
  readonly suppliersDaRequisicao = signal<Supp[] | null>(null);
  readonly listaDeConvidados = computed(() => this.suppliersDaRequisicao() ?? this.suppliers());
  readonly usandoSugeridos = computed(() => (this.suppliersDaRequisicao()?.length ?? 0) > 0);

  ngOnInit(): void {
    // COMP-21: veio da Etapa 4 com a requisição escolhida — carrega direto.
    if (this.fixedRequestId) {
      this.selectedRequestId.set(this.fixedRequestId);
      this.loadMap(this.fixedRequestId);
    }
    this.http.get<any>(`${this.api}/purchases/requests?take=1000`).subscribe({
      next: r => this.requests.set((r?.data ?? []).map((x: any) => ({ id: x.id, title: x.title || `Requisição #${x.id}` }))),
      error: () => {},
    });
    this.http.get<any>(`${this.api}/stakeholders?take=1000`).subscribe({
      next: r => this.suppliers.set((r?.data ?? []).filter((s: any) => s.type === 'Supplier').map((s: any) => ({ id: s.id, name: s.name }))),
      error: () => {},
    });
  }

  onSelectRequest(id: any): void {
    const rid = Number(id) || null;
    this.selectedRequestId.set(rid);
    this.map.set(null);
    this.invites.set([]);
    this.suppliersDaRequisicao.set(null);
    this.selectedSuppliers.set(new Set());
    this.aviso.set(null);
    if (rid) this.loadMap(rid);
  }

  private loadMap(id: number): void {
    this.loadingMap.set(true);
    this.http.get<any>(`${this.api}/quotation-map/${id}`).subscribe({
      next: m => { this.map.set(m); this.loadingMap.set(false); },
      error: () => { this.loadingMap.set(false); },
    });
    this.carregarSugeridos(id);
    this.carregarConvites(id);
  }

  /**
   * I023: os fornecedores SUGERIDOS na requisição são os convidados naturais —
   * foram escolhidos lá justamente para cotar. Já vêm marcados; quem quiser
   * convidar outro continua podendo, porque a lista completa segue disponível.
   */
  private carregarSugeridos(id: number): void {
    this.http.get<any>(`${this.api}/purchases/requests/${id}`).subscribe({
      next: r => {
        const sugeridos: Supp[] = (r?.suggestedSuppliers ?? [])
          .map((s: any) => ({ id: s.supplierId ?? s.supplier?.id, name: s.supplier?.name ?? `Fornecedor #${s.supplierId}` }))
          .filter((s: Supp) => !!s.id);
        this.suppliersDaRequisicao.set(sugeridos);
        if (sugeridos.length) this.selectedSuppliers.set(new Set(sugeridos.map(s => s.id)));
      },
      error: () => this.suppliersDaRequisicao.set(null),
    });
  }

  /** I023: os convites já existentes, para copiar e reenviar sem gerar de novo. */
  private carregarConvites(id: number): void {
    this.http.get<any>(`${this.api}/quotation-invites/${id}`).subscribe({
      next: r => this.invites.set(r?.invites ?? []),
      error: () => this.invites.set([]),
    });
  }

  isSupplierChecked(id: number): boolean { return this.selectedSuppliers().has(id); }
  toggleSupplier(id: number): void {
    const next = new Set(this.selectedSuppliers());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedSuppliers.set(next);
  }

  generateInvites(): void {
    const rid = this.selectedRequestId();
    const ids = [...this.selectedSuppliers()];
    if (!rid || !ids.length) return;
    this.generating.set(true);
    this.aviso.set(null);
    this.http.post<any>(`${this.api}/quotation-invites`, { purchaseRequestId: rid, supplierIds: ids }).subscribe({
      next: res => {
        this.generating.set(false);
        const gerados: any[] = res?.invites ?? [];
        // I023: o convite agora é ENVIADO. Dizer quantos saíram e quantos não —
        // e por quê — é o que separa "gerou o link" de "o fornecedor recebeu".
        const enviados = gerados.filter(i => i.enviado).length;
        const falhas = gerados.filter(i => !i.enviado);
        this.aviso.set(
          falhas.length
            ? `${enviados} de ${gerados.length} convite(s) enviado(s) por e-mail. Não enviados: ` +
              falhas.map(f => `${f.supplierId} (${f.motivo})`).join('; ') +
              '. Os links continuam válidos — copie e envie por fora.'
            : `${enviados} convite(s) enviado(s) por e-mail.`,
        );
        this.carregarConvites(rid);
      },
      error: () => { this.generating.set(false); this.aviso.set('Não foi possível gerar os convites.'); },
    });
  }

  /** I023: reenvia o convite mantendo o mesmo link (o token não muda). */
  reenviar(i: Invite): void {
    this.reenviando.set(i.id);
    this.aviso.set(null);
    this.http.post<any>(`${this.api}/quotation-invites/${i.id}/resend`, {}).subscribe({
      next: r => {
        this.reenviando.set(null);
        this.aviso.set(r?.mensagem ?? 'Convite reenviado.');
      },
      error: e => {
        this.reenviando.set(null);
        this.aviso.set(e?.error?.message ?? 'Não foi possível reenviar o convite.');
      },
    });
  }

  dataBR(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  copy(link: string): void {
    navigator.clipboard?.writeText(link);
    this.copied.set(link);
    setTimeout(() => this.copied.set(null), 1500);
  }

  brl(v: number): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
