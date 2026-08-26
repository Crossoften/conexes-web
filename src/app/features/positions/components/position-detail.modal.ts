// src/app/features/positions/components/position-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass, NgIf, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  Position, PositionPayload, PositionStatus, GoverningBodyMember,
  POSITION_TYPE_LABELS, POSITION_PURPOSE_LABELS, POSITION_STATUS_CONFIG, POSITION_STATUS_OPTIONS,
} from '../positions.model';
import { NotificationService } from '../../../shared/services/notification.service';

interface EntityItem       { cnpj?: string; id?: number; legalName: string; tradeName: string; }
interface CollaboratorItem { id: number; name: string; }

@Component({
  selector: 'app-position-detail-modal',
  standalone: true,
  imports: [NgClass, NgIf, DatePipe, ReactiveFormsModule, FormsModule],
  templateUrl: './position-detail.modal.html',
  styleUrl: './position-detail.modal.scss',
})
export class PositionDetailModalComponent implements OnChanges, OnInit {
  @Input() position: Position | null = null;
  @Input() loading = false;
  /** T1: quando 'edit', o modal abre já em edição (botão "Editar" da lista). */
  @Input() initialMode: 'view' | 'edit' = 'view';

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<PositionPayload>();

  private readonly fb     = inject(FormBuilder);
  private readonly http   = inject(HttpClient);
  private readonly notify = inject(NotificationService);

  protected mode: 'view' | 'edit' = 'view';

  readonly entities      = signal<EntityItem[]>([]);
  readonly collaborators = signal<CollaboratorItem[]>([]);
  readonly loadingLists  = signal(false);

  readonly statusConfig  = POSITION_STATUS_CONFIG;
  readonly statusOptions = POSITION_STATUS_OPTIONS;

  // Integrantes editáveis localmente. `membersDirty` evita que a resposta tardia
  // do getById (openDetail hidrata o modal em duas levas) apague linhas recém-editadas.
  members: GoverningBodyMember[] = [];
  private membersDirty = false;
  selectedCollaborator = '';
  selectedStartDate    = '';
  selectedEndDate      = '';

  protected readonly form = this.fb.group({
    entidadeSelect: ['', Validators.required],
    tipo:           ['', Validators.required],
    finalidade:     ['', Validators.required],
    descricao:      ['', Validators.required],
    dataEleicao:    ['', Validators.required],
    codigoAudesp:   [''],
    status:         ['Active', Validators.required],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.mode = this.initialMode;

    this.loadingLists.set(true);
    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) this.loadingLists.set(false); };

    this.http.get<EntityItem[]>(`${environment.apiUrl}/v1/institutional/entities`).subscribe({
      next: items => { this.entities.set(items); checkDone(); },
      error: ()   => checkDone(),
    });
    this.http.get<CollaboratorItem[]>(`${environment.apiUrl}/v1/institutional/collaborators`).subscribe({
      next: items => { this.collaborators.set(items); checkDone(); },
      error: ()   => checkDone(),
    });
  }

  ngOnChanges(): void {
    if (this.position) {
      this.form.patchValue({
        entidadeSelect: String(this.position.entityId ?? ''),
        tipo:           this.position.type          ?? '',
        finalidade:     this.position.purpose       ?? '',
        descricao:      this.position.description    ?? '',
        // input type="date" só aceita yyyy-MM-dd; corta o ISO senão fica vazio.
        dataEleicao:    (this.position.electionDate ?? '').substring(0, 10),
        codigoAudesp:   this.position.tcespCertCode  ?? '',
        status:         this.position.status         ?? 'Active',
      });
      if (!this.membersDirty) {
        this.members = (this.position.members ?? []).map(m => ({
          collaboratorId: m.collaboratorId,
          startDate:      (m.startDate ?? '')?.toString().substring(0, 10) || null,
          endDate:        (m.endDate   ?? '')?.toString().substring(0, 10) || null,
        }));
      }
    }
  }

  // ── Helpers de view ───────────────────────────────────────────────────────

  get entityName(): string {
    if (!this.position) return '—';
    const found = this.entities().find(e => e.id === this.position!.entityId);
    return found ? (found.tradeName || found.legalName) : String(this.position.entityId);
  }

  typeLabel(v: string): string    { return POSITION_TYPE_LABELS[v] ?? v ?? '—'; }
  purposeLabel(v: string): string { return POSITION_PURPOSE_LABELS[v] ?? v ?? '—'; }

  getCollaboratorName(id: number): string {
    return this.collaborators().find(c => c.id === id)?.name ?? String(id);
  }

  // ── Integrantes ───────────────────────────────────────────────────────────

  addMember(): boolean {
    if (!this.selectedCollaborator || !this.selectedStartDate) {
      this.notify.error('Informe o colaborador e a data de início para adicionar o integrante.');
      return false;
    }
    const id = Number(this.selectedCollaborator);
    if (this.members.some(m => m.collaboratorId === id)) {
      this.notify.error('Este colaborador já está na lista de integrantes.');
      return false;
    }

    this.members = [
      ...this.members,
      { collaboratorId: id, startDate: this.selectedStartDate, endDate: this.selectedEndDate || null },
    ];
    this.membersDirty         = true;
    this.selectedCollaborator = '';
    this.selectedStartDate    = '';
    this.selectedEndDate      = '';
    return true;
  }

  removeMember(index: number): void {
    this.members = this.members.filter((_, i) => i !== index);
    this.membersDirty = true;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  onClose(): void {
    this.mode = 'view';
    this.close.emit();
  }

  onEdit(): void {
    this.mode = 'edit';
  }

  onCancelEdit(): void {
    this.mode = 'view';
    this.membersDirty         = false;
    this.selectedCollaborator = '';
    this.selectedStartDate    = '';
    this.selectedEndDate      = '';
    if (this.position) this.ngOnChanges();
  }

  onDelete(): void {
    if (this.position) this.delete.emit(this.position.id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Linha de integrante preenchida sem clicar no "+" não pode ser descartada:
    // members vazio no PATCH apaga todos os integrantes no back (deleteMany).
    if ((this.selectedCollaborator || this.selectedStartDate) && !this.addMember()) return;

    const v = this.form.value;
    // Datas: ISO 8601 completo quando há valor; null quando vazio (o back exige ISO).
    const toIso = (d: unknown): string | null => {
      const s = (d ?? '').toString().trim();
      return s ? new Date(s).toISOString() : null;
    };

    const payload: PositionPayload = {
      entityId:      Number(v.entidadeSelect) || 0,
      electionDate:  toIso(v.dataEleicao),
      type:          v.tipo               ?? '',
      purpose:       v.finalidade         ?? '',
      status:        (v.status as PositionStatus) ?? 'Active',
      description:   v.descricao          ?? '',
      tcespCertCode: v.codigoAudesp       ?? '',
      members:       this.members.map(m => ({
        collaboratorId: m.collaboratorId,
        startDate:      toIso(m.startDate),
        endDate:        toIso(m.endDate),
      })),
    };

    this.saved.emit(payload);
  }
}
