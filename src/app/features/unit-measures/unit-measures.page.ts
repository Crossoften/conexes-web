// src/app/features/unit-measures/unit-measures.page.ts
// item 10 (reteste 22.09): cadastro básico de Unidades de Medida (Sigla + Nome)
// e conversão entre unidades (ex.: 1 CX = 12 UN) para compras e recebimento.
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UnitMeasuresService, UnitMeasure } from './unit-measures.service';

@Component({
  selector: 'app-unit-measures',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
        <h1 class="page-title">Unidades de medida</h1>
        <a class="btn-outline btn-outline--orange" routerLink="/purchasing-registries">Voltar aos cadastros</a>
      </div>

      @if (error()) { <div class="error-banner" role="alert">{{ error() }}</div> }

      <!-- Nova unidade -->
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header"><h2 class="card-title">Nova unidade</h2><p class="card-subtitle">Cadastro básico: sigla e nome (ex.: UN — Unidade).</p></div>
        <div class="card-body">
          <div class="um-row">
            <div class="form-group" style="max-width:140px;">
              <label>Sigla <span class="req">*</span></label>
              <input class="form-control" [(ngModel)]="newAbbr" placeholder="Ex.: CX" maxlength="10" (keyup.enter)="addUnit()">
            </div>
            <div class="form-group" style="flex:1;">
              <label>Nome <span class="req">*</span></label>
              <input class="form-control" [(ngModel)]="newName" placeholder="Ex.: Caixa" maxlength="60" (keyup.enter)="addUnit()">
            </div>
            <button type="button" class="btn-solid btn-solid--orange" [disabled]="savingUnit() || !newAbbr.trim() || !newName.trim()" (click)="addUnit()">
              {{ savingUnit() ? 'Salvando…' : 'Adicionar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de unidades -->
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header"><h2 class="card-title">Unidades cadastradas</h2></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th class="th">Sigla</th><th class="th">Nome</th><th class="th th--center">Ações</th></tr></thead>
            <tbody>
              @if (loading()) {
                <tr><td class="td--empty" colspan="3">Carregando…</td></tr>
              } @else if (units().length === 0) {
                <tr><td class="td--empty" colspan="3">Nenhuma unidade cadastrada.</td></tr>
              } @else {
                @for (u of units(); track u.id) {
                  <tr class="tr">
                    <td class="td td--mono">{{ u.abbreviation }}</td>
                    <td class="td td--name">{{ u.name }}</td>
                    <td class="td td--center">
                      <button type="button" class="icon-btn icon-btn--danger" aria-label="Excluir" (click)="removeUnit(u)">
                        <svg viewBox="0 0 20 20" fill="none" width="15" height="15"><path d="M4 6h12M8 6V4h4v2M7 6v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Conversões -->
      <div class="card">
        <div class="card-header"><h2 class="card-title">Conversões</h2><p class="card-subtitle">Para compras e recebimento — ex.: 1 CX = 12 UN.</p></div>
        <div class="card-body">
          <div class="um-row" style="align-items:flex-end;">
            <div class="form-group" style="max-width:90px;"><label>Quantidade</label><input class="form-control" value="1" disabled></div>
            <div class="form-group"><label>Unidade origem <span class="req">*</span></label>
              <div class="select-wrap"><select class="form-control" [(ngModel)]="convFrom">
                <option [ngValue]="null">Selecione</option>
                @for (u of units(); track u.id) { <option [ngValue]="u.id">{{ u.abbreviation }} — {{ u.name }}</option> }
              </select></div>
            </div>
            <div class="um-eq">=</div>
            <div class="form-group" style="max-width:120px;"><label>Fator <span class="req">*</span></label><input class="form-control" [(ngModel)]="convFactor" inputmode="decimal" placeholder="12"></div>
            <div class="form-group"><label>Unidade destino <span class="req">*</span></label>
              <div class="select-wrap"><select class="form-control" [(ngModel)]="convTo">
                <option [ngValue]="null">Selecione</option>
                @for (u of units(); track u.id) { <option [ngValue]="u.id">{{ u.abbreviation }} — {{ u.name }}</option> }
              </select></div>
            </div>
            <button type="button" class="btn-solid btn-solid--orange" [disabled]="savingConv()" (click)="addConversion()">{{ savingConv() ? 'Salvando…' : 'Adicionar' }}</button>
          </div>

          @if (conversions().length) {
            <div class="um-chips">
              @for (c of conversions(); track c.id) {
                <span class="um-chip">1 {{ c.fromUnit.abbreviation }} = {{ c.factor }} {{ abbr(c.toUnitId) }}
                  <button type="button" aria-label="Remover conversão" (click)="removeConversion(c.id)">×</button>
                </span>
              }
            </div>
          } @else {
            <p style="margin-top:12px; color:var(--text-muted,#9CA3AF); font-size:13px;">Nenhuma conversão cadastrada.</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .um-row { display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; }
    .um-eq { font-size:20px; font-weight:700; color:var(--text-muted,#9CA3AF); padding-bottom:10px; }
    .um-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
    .um-chip { display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border:1px solid var(--surface-border,#E5E7EB); border-radius:999px; background:#f4f6f9; font-size:13px; font-weight:600; color:var(--text-primary,#111827); }
    .um-chip button { border:none; background:none; cursor:pointer; color:#dc2626; font-size:16px; line-height:1; padding:0; }
    .error-banner { background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA; border-radius:10px; padding:12px 14px; margin-bottom:16px; font-size:14px; }
  `],
})
export class UnitMeasuresPage {
  private svc = inject(UnitMeasuresService);

  readonly units   = signal<UnitMeasure[]>([]);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  newAbbr = '';
  newName = '';
  readonly savingUnit = signal(false);

  convFrom: number | null = null;
  convTo: number | null = null;
  convFactor = '';
  readonly savingConv = signal(false);

  /** Todas as conversões achatadas (cada unidade traz as suas em conversionsFrom). */
  readonly conversions = computed(() =>
    this.units().flatMap(u => (u.conversionsFrom ?? []).map(c => ({ ...c, fromUnit: u }))),
  );

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true); this.error.set(null);
    this.svc.list().subscribe({
      next: u => { this.units.set(u); this.loading.set(false); },
      error: e => { this.loading.set(false); this.error.set(e?.error?.message ?? 'Erro ao carregar unidades.'); },
    });
  }

  addUnit(): void {
    const abbreviation = this.newAbbr.trim();
    const name = this.newName.trim();
    if (!abbreviation || !name || this.savingUnit()) return;
    this.savingUnit.set(true);
    this.svc.create({ abbreviation, name }).subscribe({
      next: () => { this.newAbbr = ''; this.newName = ''; this.savingUnit.set(false); this.load(); },
      error: e => { this.savingUnit.set(false); alert(e?.error?.message ?? 'Erro ao cadastrar a unidade.'); },
    });
  }

  removeUnit(u: UnitMeasure): void {
    if (!confirm(`Excluir a unidade ${u.abbreviation} — ${u.name}? As conversões associadas também serão removidas.`)) return;
    this.svc.remove(u.id).subscribe({ next: () => this.load(), error: e => alert(e?.error?.message ?? 'Erro ao excluir a unidade.') });
  }

  addConversion(): void {
    const fromUnitId = Number(this.convFrom);
    const toUnitId = Number(this.convTo);
    const factor = parseFloat(String(this.convFactor).replace(',', '.'));
    if (!fromUnitId || !toUnitId || !(factor > 0)) { alert('Preencha origem, destino e um fator maior que zero.'); return; }
    if (fromUnitId === toUnitId) { alert('A conversão deve ser entre unidades diferentes.'); return; }
    this.savingConv.set(true);
    this.svc.addConversion({ fromUnitId, toUnitId, factor }).subscribe({
      next: () => { this.convFactor = ''; this.convTo = null; this.savingConv.set(false); this.load(); },
      error: e => { this.savingConv.set(false); alert(e?.error?.message ?? 'Erro ao adicionar a conversão.'); },
    });
  }

  removeConversion(id: number): void {
    this.svc.removeConversion(id).subscribe({ next: () => this.load(), error: e => alert(e?.error?.message ?? 'Erro ao remover a conversão.') });
  }

  abbr(id: number): string {
    return this.units().find(u => u.id === id)?.abbreviation ?? ('#' + id);
  }
}
