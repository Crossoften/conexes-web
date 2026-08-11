// features/transparency/transparency-list.page.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransparencyService, TransparencyPartnership } from './transparency.service';
import { STATUS_LABELS, statusClass } from './transparency.util';

@Component({
  selector: 'app-transparency-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './transparency-list.page.html',
  styleUrl: './transparency.scss',
})
export class TransparencyListPage implements OnInit {
  private service = inject(TransparencyService);
  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<TransparencyPartnership[]>([]);
  search = '';

  readonly filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.all();
    return this.all().filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.grantor.toLowerCase().includes(q) ||
      p.entity.toLowerCase().includes(q));
  });

  readonly totalGranted = computed(() => this.all().reduce((s, p) => s + (p.totalValue || 0), 0));

  ngOnInit(): void {
    this.service.list().subscribe({
      next: rows => { this.all.set(rows); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  money(v: number): string { return this.brl.format(v || 0); }
  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return statusClass(s); }
}
