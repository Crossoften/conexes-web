// src/app/features/supplier-contracts/supplier-contracts.page.ts
// item 5 (reteste 22.09): cadastro de contrato de FORNECEDOR (jurídico), que alimenta o
// vínculo na requisição de compra (contractId). Backend Contract já tem CRUD.
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PurchasesService } from '../purchases/purchases.service';
import { PurchaseContract, PurchaseRef } from '../purchases/purchases.model';

@Component({
  selector: 'app-supplier-contracts',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
        <h1 class="page-title">Contratos de fornecedor</h1>
        <a class="btn-outline btn-outline--orange" routerLink="/purchasing-registries">Voltar aos cadastros</a>
      </div>

      @if (error()) { <div class="error-banner" role="alert">{{ error() }}</div> }

      <div class="card" style="margin-bottom:18px;">
        <div class="card-header">
          <h2 class="card-title">{{ editingId ? 'Editar contrato' : 'Novo contrato' }}</h2>
          <p class="card-subtitle">Contrato jurídico firmado com fornecedor/prestador (objeto, vigência e valor).</p>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-row grid-cols-3">
              <div class="form-group"><label>Número</label><input class="form-control" [(ngModel)]="f.number" placeholder="Ex.: CT-2026-001"></div>
              <div class="form-group" style="grid-column: span 2;"><label>Objeto / Título <span class="req">*</span></label><input class="form-control" [(ngModel)]="f.title" placeholder="Objeto do contrato"></div>
            </div>
            <div class="form-row grid-cols-3">
              <div class="form-group">
                <label>Fornecedor</label>
                <div class="select-wrap">
                  <select class="form-control" [(ngModel)]="f.stakeholderId">
                    <option [ngValue]="null">Selecione</option>
                    @for (s of suppliers(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
                  </select>
                  <svg class="select-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
              <div class="form-group"><label>Início da vigência</label><input type="date" class="form-control" [(ngModel)]="f.startDate"></div>
              <div class="form-group"><label>Fim da vigência</label><input type="date" class="form-control" [(ngModel)]="f.endDate"></div>
            </div>
            <div class="form-row grid-cols-3">
              <div class="form-group"><label>Valor (R$)</label><input class="form-control" inputmode="decimal" [(ngModel)]="f.value" placeholder="0,00"></div>
              <div class="form-group" style="grid-column: span 2;"><label>Observação</label><input class="form-control" [(ngModel)]="f.observation" placeholder="Condições, escopo, etc."></div>
            </div>
          </div>
        </div>
        <div class="card-footer" style="display:flex; gap:10px; justify-content:flex-end;">
          @if (editingId) { <button type="button" class="btn-outline btn-outline--orange" (click)="resetForm()">Cancelar edição</button> }
          <button type="button" class="btn-solid btn-solid--orange" [disabled]="saving() || !f.title.trim()" (click)="save()">
            {{ saving() ? 'Salvando…' : (editingId ? 'Salvar alterações' : 'Adicionar contrato') }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2 class="card-title">Contratos cadastrados</h2></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th class="th">Número</th><th class="th">Objeto</th><th class="th">Fornecedor</th><th class="th">Vigência</th><th class="th right">Valor</th><th class="th th--center">Ações</th></tr></thead>
            <tbody>
              @if (loading()) {
                <tr><td class="td--empty" colspan="6">Carregando…</td></tr>
              } @else if (contracts().length === 0) {
                <tr><td class="td--empty" colspan="6">Nenhum contrato cadastrado.</td></tr>
              } @else {
                @for (c of contracts(); track c.id) {
                  <tr class="tr">
                    <td class="td td--mono">{{ c.number || '—' }}</td>
                    <td class="td td--name">{{ c.title }}</td>
                    <td class="td">{{ c.stakeholder?.name || '—' }}</td>
                    <td class="td">{{ fmtDate(c.startDate) }} — {{ fmtDate(c.endDate) }}</td>
                    <td class="td right">{{ fmtMoney(c.value) }}</td>
                    <td class="td td--center">
                      <button type="button" class="icon-btn" aria-label="Editar" (click)="edit(c)"><svg viewBox="0 0 20 20" fill="none" width="15" height="15"><path d="M13.5 3.5a2.121 2.121 0 0 1 3 3L7 16H4v-3L13.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                      <button type="button" class="icon-btn icon-btn--danger" aria-label="Excluir" (click)="remove(c)"><svg viewBox="0 0 20 20" fill="none" width="15" height="15"><path d="M4 6h12M8 6V4h4v2M7 6v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .right { text-align:right; }
    .error-banner { background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA; border-radius:10px; padding:12px 14px; margin-bottom:16px; font-size:14px; }
  `],
})
export class SupplierContractsPage {
  private svc = inject(PurchasesService);

  readonly contracts = signal<PurchaseContract[]>([]);
  readonly suppliers = signal<PurchaseRef[]>([]);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly error     = signal<string | null>(null);

  editingId: number | null = null;
  f = { number: '', title: '', stakeholderId: null as number | null, startDate: '', endDate: '', value: '', observation: '' };

  constructor() {
    this.load();
    this.svc.getSuppliersOnlyLookup().subscribe({ next: s => this.suppliers.set(s), error: () => {} });
  }

  load(): void {
    this.loading.set(true); this.error.set(null);
    this.svc.getContracts({ take: 500 }).subscribe({
      next: res => { this.contracts.set(res.data ?? []); this.loading.set(false); },
      error: e => { this.loading.set(false); this.error.set(e?.error?.message ?? 'Erro ao carregar contratos.'); },
    });
  }

  private toIso(d: string): string | undefined { return d ? new Date(d + 'T00:00:00').toISOString() : undefined; }
  private toDateInput(iso?: string): string { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }

  edit(c: PurchaseContract): void {
    this.editingId = c.id;
    this.f = {
      number: c.number ?? '', title: c.title ?? '', stakeholderId: c.stakeholderId ?? null,
      startDate: this.toDateInput(c.startDate), endDate: this.toDateInput(c.endDate),
      value: c.value != null ? String(c.value).replace('.', ',') : '', observation: c.observation ?? '',
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm(): void {
    this.editingId = null;
    this.f = { number: '', title: '', stakeholderId: null, startDate: '', endDate: '', value: '', observation: '' };
  }

  save(): void {
    const title = this.f.title.trim();
    if (!title || this.saving()) return;
    const payload = {
      title,
      number: this.f.number.trim() || undefined,
      stakeholderId: this.f.stakeholderId ? Number(this.f.stakeholderId) : undefined,
      startDate: this.toIso(this.f.startDate),
      endDate: this.toIso(this.f.endDate),
      value: this.f.value ? (parseFloat(String(this.f.value).replace(/\./g, '').replace(',', '.')) || undefined) : undefined,
      observation: this.f.observation.trim() || undefined,
    };
    this.saving.set(true);
    const obs = this.editingId ? this.svc.updateContract(this.editingId, payload) : this.svc.createContract(payload);
    obs.subscribe({
      next: () => { this.saving.set(false); this.resetForm(); this.load(); },
      error: e => { this.saving.set(false); alert(e?.error?.message ?? 'Erro ao salvar o contrato.'); },
    });
  }

  remove(c: PurchaseContract): void {
    if (!confirm(`Excluir o contrato "${c.title}"?`)) return;
    this.svc.deleteContract(c.id).subscribe({ next: () => this.load(), error: e => alert(e?.error?.message ?? 'Erro ao excluir. Pode estar vinculado a uma requisição.') });
  }

  fmtDate(iso?: string): string { if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR'); }
  fmtMoney(v?: number): string { return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
}
