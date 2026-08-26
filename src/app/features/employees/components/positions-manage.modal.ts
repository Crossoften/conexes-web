// src/app/features/employees/components/positions-manage.modal.ts
// B11: gestão de cargos (CRUD /v1/positions) acessível na tela de Colaboradores.
import { Component, EventEmitter, Output, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeesService } from '../employees.service';
import { PositionOption } from '../employees.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-positions-manage-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './positions-manage.modal.html',
  styleUrl: './positions-manage.modal.scss',
})
export class PositionsManageModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private svc    = inject(EmployeesService);
  private notify = inject(NotificationService);

  readonly positions = signal<PositionOption[]>([]);
  readonly loading   = signal(false);
  readonly saving    = signal(false);

  newName        = '';
  newDescription = '';

  readonly editId    = signal<number | null>(null);
  editName        = '';
  editDescription = '';

  readonly confirmId = signal<number | null>(null);

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.svc.getPositions().subscribe({
      next: items => { this.positions.set(items); this.loading.set(false); },
      error: ()    => { this.positions.set([]); this.loading.set(false); },
    });
  }

  positionLabel(p: PositionOption): string { return p.name || p.title || ''; }

  add(): void {
    const name = this.newName.trim();
    if (!name) { this.notify.error('Informe o nome do cargo.'); return; }
    this.saving.set(true);
    this.svc.createPosition({ name, description: this.newDescription.trim() || undefined }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Cargo cadastrado com sucesso.');
        this.newName = '';
        this.newDescription = '';
        this.reload();
      },
      error: e => { this.saving.set(false); this.notify.error(this.msg(e)); },
    });
  }

  startEdit(p: PositionOption): void {
    this.editId.set(p.id);
    this.editName        = this.positionLabel(p);
    this.editDescription = p.description ?? '';
    this.confirmId.set(null);
  }

  cancelEdit(): void {
    this.editId.set(null);
    this.editName        = '';
    this.editDescription = '';
  }

  saveEdit(id: number): void {
    const name = this.editName.trim();
    if (!name) { this.notify.error('Informe o nome do cargo.'); return; }
    this.saving.set(true);
    this.svc.updatePosition(id, { name, description: this.editDescription.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Cargo atualizado.');
        this.cancelEdit();
        this.reload();
      },
      error: e => { this.saving.set(false); this.notify.error(this.msg(e)); },
    });
  }

  askRemove(id: number): void { this.confirmId.set(id); this.cancelEdit(); }
  clearConfirm(): void { this.confirmId.set(null); }

  confirmRemove(id: number): void {
    this.saving.set(true);
    this.svc.deletePosition(id).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Cargo excluído.');
        this.clearConfirm();
        this.reload();
      },
      error: e => { this.saving.set(false); this.notify.error(this.msg(e)); },
    });
  }

  onClose(): void { this.close.emit(); }

  private msg(e: any): string {
    const m = e?.error?.message;
    return Array.isArray(m) ? m.join(', ') : (m || 'Operação não concluída. Tente novamente.');
  }
}
