// src/app/features/positions/new/positions-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PositionsService } from '../positions.service';
import { PositionPayload, GoverningBodyMember } from '../positions.model';
import { environment } from '../../../../environments/environment';

interface EntityItem       { cnpj?: string; id?: number; legalName: string; tradeName: string; }
interface CollaboratorItem { id: number; name: string; }

@Component({
  selector: 'app-positions-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, NgClass],
  templateUrl: './positions-new.page.html',
  styleUrl: './positions-new.page.scss',
})
export class PositionsNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(PositionsService);
  private http   = inject(HttpClient);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly entities     = signal<EntityItem[]>([]);
  readonly collaborators = signal<CollaboratorItem[]>([]);
  readonly loadingLists = signal(true);

  isIntegrantesOpen = true;

  // Members gerenciados como array dinâmico
  members: GoverningBodyMember[] = [];
  selectedCollaborator = '';
  selectedStartDate    = '';
  selectedEndDate      = '';

  form: FormGroup = this.fb.group({
    entidadeSelect: ['', Validators.required],
    tipo:           ['', Validators.required],
    finalidade:     ['', Validators.required],
    descricao:      ['', Validators.required],
    dataEleicao:    ['', Validators.required],
    codigoAudesp:   [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) this.loadingLists.set(false); };

    this.http.get<EntityItem[]>(`${environment.apiUrl}/v1/institutional/entities`).subscribe({
      next: items => { this.entities.set(items); checkDone(); },
      error: () => checkDone(),
    });

    this.http.get<CollaboratorItem[]>(`${environment.apiUrl}/v1/institutional/collaborators`).subscribe({
      next: items => { this.collaborators.set(items); checkDone(); },
      error: () => checkDone(),
    });
  }

  // ── Members ───────────────────────────────────────────────────────────────

  addMember(): void {
    if (!this.selectedCollaborator || !this.selectedStartDate) return;
    const id = Number(this.selectedCollaborator);
    if (this.members.some(m => m.collaboratorId === id)) return;

    this.members = [
      ...this.members,
      {
        collaboratorId: id,
        startDate:      this.selectedStartDate,
        endDate:        this.selectedEndDate ?? '',
      },
    ];
    this.selectedCollaborator = '';
    this.selectedStartDate    = '';
    this.selectedEndDate      = '';
  }

  removeMember(index: number): void {
    this.members = this.members.filter((_, i) => i !== index);
  }

  getCollaboratorName(id: number): string {
    return this.collaborators().find(c => c.id === id)?.name ?? String(id);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  toggleIntegrantes(): void {
    this.isIntegrantesOpen = !this.isIntegrantesOpen;
  }

  resetForm(): void {
    this.form.reset();
    this.members              = [];
    this.selectedCollaborator = '';
    this.selectedStartDate    = '';
    this.selectedEndDate      = '';
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: PositionPayload = {
      entityId:      Number(v.entidadeSelect) || 0,
      electionDate:  v.dataEleicao            ?? '',
      type:          v.tipo                   ?? '',
      purpose:       v.finalidade             ?? '',
      description:   v.descricao              ?? '',
      tcespCertCode: v.codigoAudesp           ?? '',
      members:       this.members,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/positions']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
