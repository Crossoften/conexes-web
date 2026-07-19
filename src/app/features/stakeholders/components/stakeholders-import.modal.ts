// src/app/features/stakeholders/components/stakeholders-import.modal.ts
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { StakeholdersService } from '../stakeholders.service';
import { ImportBatchSummary } from '../stakeholders.model';

type ImportTab = 'IMPORTAR' | 'LOTES';

@Component({
  selector: 'app-stakeholders-import-modal',
  standalone: true,
  imports: [],
  templateUrl: './stakeholders-import.modal.html',
  styleUrl: './stakeholders-import.modal.scss',
})
export class StakeholdersImportModalComponent implements OnInit {
  /** Aba inicial (importar ou histórico de lotes). */
  @Input() initialTab: ImportTab = 'IMPORTAR';
  @Output() close = new EventEmitter<void>();

  private svc = inject(StakeholdersService);

  readonly activeTab = signal<ImportTab>('IMPORTAR');

  ngOnInit(): void {
    this.setTab(this.initialTab);
  }

  // ── Importar ────────────────────────────────────────────────────────────────
  readonly selectedFile    = signal<File | null>(null);
  readonly uploading       = signal(false);
  readonly summary         = signal<ImportBatchSummary | null>(null);
  readonly importError     = signal<string | null>(null);
  readonly templateLoading = signal(false);

  // ── Lotes ─────────────────────────────────────────────────────────────────
  readonly batches        = signal<ImportBatchSummary[]>([]);
  readonly batchesLoading  = signal(false);
  readonly batchesError    = signal<string | null>(null);
  readonly selectedBatch   = signal<ImportBatchSummary | null>(null);

  setTab(tab: ImportTab): void {
    this.activeTab.set(tab);
    if (tab === 'LOTES' && !this.batches().length) this.loadBatches();
  }

  onClose(): void { this.close.emit(); }

  // ── Importar ────────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.importError.set(null);
  }

  downloadTemplate(): void {
    this.templateLoading.set(true);
    this.svc.downloadImportTemplate().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url;
        a.download = 'modelo-stakeholders.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        this.templateLoading.set(false);
      },
      error: err => {
        this.importError.set(err?.error?.message ?? 'Erro ao baixar o modelo.');
        this.templateLoading.set(false);
      },
    });
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.importError.set(null);
    this.summary.set(null);
    this.svc.importFile(file).subscribe({
      next: res => {
        this.summary.set(res);
        this.uploading.set(false);
        this.selectedFile.set(null);
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao importar a planilha.';
        this.importError.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.uploading.set(false);
      },
    });
  }

  // ── Lotes ─────────────────────────────────────────────────────────────────

  loadBatches(): void {
    this.batchesLoading.set(true);
    this.batchesError.set(null);
    this.svc.getImportBatches({ take: 50 }).subscribe({
      next: res => {
        const list = Array.isArray(res) ? res : ((res as { data?: ImportBatchSummary[] })?.data ?? []);
        this.batches.set(list);
        this.batchesLoading.set(false);
      },
      error: err => {
        this.batchesError.set(err?.error?.message ?? 'Erro ao carregar os lotes.');
        this.batchesLoading.set(false);
      },
    });
  }

  openBatch(b: ImportBatchSummary): void {
    this.selectedBatch.set(b);
    // Busca o detalhe (com erros por linha) — a listagem pode vir enxuta.
    this.svc.getImportBatch(b.batchId).subscribe({
      next: full => { if (this.selectedBatch()?.batchId === b.batchId) this.selectedBatch.set(full); },
      error: () => { /* mantém os dados da lista */ },
    });
  }

  closeBatch(): void { this.selectedBatch.set(null); }
}
