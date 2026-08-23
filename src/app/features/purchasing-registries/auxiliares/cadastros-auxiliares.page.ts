// src/app/features/purchasing-registries/auxiliares/cadastros-auxiliares.page.ts
// POS-05: gestão dos cadastros auxiliares de Compras (Grupos e Fabricantes).
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PurchasingRegistriesService } from '../purchasing-registries.service';
import { NotificationService } from '../../../shared/services/notification.service';

type Kind = 'group' | 'manufacturer';
interface Aux { id: number; name: string; }

@Component({
  selector: 'app-cadastros-auxiliares',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastros-auxiliares.page.html',
  styleUrl: './cadastros-auxiliares.page.scss',
})
export class CadastrosAuxiliaresPage implements OnInit {
  private svc    = inject(PurchasingRegistriesService);
  private notify = inject(NotificationService);

  readonly groups        = signal<Aux[]>([]);
  readonly manufacturers = signal<Aux[]>([]);

  newGroup = '';
  newManufacturer = '';

  // edição inline
  readonly editKind = signal<Kind | null>(null);
  readonly editId   = signal<number | null>(null);
  editName = '';

  // confirmação de exclusão inline (sem caixa nativa — POS-04)
  readonly confirmKind = signal<Kind | null>(null);
  readonly confirmId   = signal<number | null>(null);

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.svc.getProductGroups().subscribe({ next: g => this.groups.set(g), error: () => {} });
    this.svc.getManufacturers().subscribe({ next: m => this.manufacturers.set(m), error: () => {} });
  }

  add(kind: Kind): void {
    const name = (kind === 'group' ? this.newGroup : this.newManufacturer).trim();
    if (!name) { this.notify.error('Informe um nome.'); return; }
    const obs = kind === 'group' ? this.svc.createProductGroup(name) : this.svc.createManufacturer(name);
    obs.subscribe({
      next: () => { this.notify.success('Cadastrado com sucesso.'); if (kind === 'group') this.newGroup = ''; else this.newManufacturer = ''; this.reload(); },
      error: (e) => this.notify.error(this.msg(e)),
    });
  }

  startEdit(kind: Kind, item: Aux): void { this.editKind.set(kind); this.editId.set(item.id); this.editName = item.name; this.clearConfirm(); }
  cancelEdit(): void { this.editKind.set(null); this.editId.set(null); this.editName = ''; }
  saveEdit(kind: Kind, id: number): void {
    const name = this.editName.trim();
    if (!name) { this.notify.error('Informe um nome.'); return; }
    const obs = kind === 'group' ? this.svc.updateProductGroup(id, name) : this.svc.updateManufacturer(id, name);
    obs.subscribe({ next: () => { this.notify.success('Atualizado.'); this.cancelEdit(); this.reload(); }, error: (e) => this.notify.error(this.msg(e)) });
  }

  askRemove(kind: Kind, item: Aux): void { this.confirmKind.set(kind); this.confirmId.set(item.id); this.cancelEdit(); }
  clearConfirm(): void { this.confirmKind.set(null); this.confirmId.set(null); }
  confirmRemove(kind: Kind, id: number): void {
    const obs = kind === 'group' ? this.svc.deleteProductGroup(id) : this.svc.deleteManufacturer(id);
    obs.subscribe({
      next: () => { this.notify.success('Excluído.'); this.clearConfirm(); this.reload(); },
      error: (e) => this.notify.error(this.msg(e)),
    });
  }

  isEditing(kind: Kind, id: number): boolean { return this.editKind() === kind && this.editId() === id; }
  isConfirming(kind: Kind, id: number): boolean { return this.confirmKind() === kind && this.confirmId() === id; }

  private msg(e: any): string {
    const m = e?.error?.message;
    return Array.isArray(m) ? m.join(', ') : (m || 'Operação não concluída. Verifique se o registro não está em uso.');
  }
}
