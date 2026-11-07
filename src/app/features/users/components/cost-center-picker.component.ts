// src/app/features/users/components/cost-center-picker.component.ts
//
// Card #720 (AC-04 / RF32): centros de custo a que o usuário tem acesso. Complementa o
// Perfil de Permissão (módulo × ação). Nenhum marcado = acesso a todos (como antes).
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { PurchasesService } from '../../purchases/purchases.service';

@Component({
  selector: 'app-cost-center-picker',
  standalone: true,
  template: `
    <div class="ccp" data-testid="cost-center-picker">
      <div class="ccp__head">
        <input type="text" class="ccp__busca" placeholder="Buscar centro de custo..." [value]="busca()"
               (input)="busca.set($any($event.target).value)">
        <span class="ccp__conta">{{ selected.length ? selected.length + ' selecionado(s)' : 'Todos os centros de custo' }}</span>
      </div>
      <div class="ccp__lista">
        @for (c of filtrados(); track c.id) {
          <label class="ccp__item">
            <input type="checkbox" [checked]="selected.includes(c.id)" (change)="alternar(c.id)">
            <span>{{ c.name }}</span>
          </label>
        } @empty {
          <span class="ccp__vazio">{{ carregando() ? 'Carregando...' : 'Nenhum centro de custo encontrado.' }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .ccp { border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px; background: #fff; }
    .ccp__head { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
    .ccp__busca { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
    .ccp__conta { font-size: 12px; color: #6B7280; white-space: nowrap; }
    .ccp__lista { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px 12px; max-height: 180px; overflow: auto; }
    .ccp__item { display: flex; gap: 8px; align-items: center; font-size: 13px; cursor: pointer; }
    .ccp__vazio { font-size: 13px; color: #6B7280; }
  `],
})
export class CostCenterPickerComponent implements OnInit {
  private lookups = inject(PurchasesService);

  @Input() selected: number[] = [];
  @Output() selectedChange = new EventEmitter<number[]>();

  readonly opcoes = signal<{ id: number; name: string }[]>([]);
  readonly carregando = signal(true);
  readonly busca = signal('');
  readonly filtrados = computed(() => {
    const t = this.busca().trim().toLowerCase();
    return t ? this.opcoes().filter(o => o.name.toLowerCase().includes(t)) : this.opcoes();
  });

  ngOnInit(): void {
    // só analíticos: sintético é totalizador e não recebe lançamento (CC-01)
    this.lookups.getCostCentersLookup().subscribe({
      next: v => { this.opcoes.set(this.lookups.apenasAnaliticas(v).map(r => ({ id: Number(r.id), name: r.name }))); this.carregando.set(false); },
      error: () => this.carregando.set(false),
    });
  }

  alternar(id: number): void {
    const novo = this.selected.includes(id) ? this.selected.filter(x => x !== id) : [...this.selected, id];
    this.selected = novo;
    this.selectedChange.emit(novo);
  }
}
