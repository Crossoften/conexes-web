// features/transparency/transparency-agency.page.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TransparencyService, TransparencyGrantor, TransparencyPartnership } from './transparency.service';
import { STATUS_LABELS, statusClass } from './transparency.util';

@Component({
  selector: 'app-transparency-agency',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './transparency-agency.page.html',
  styleUrl: './transparency.scss',
})
export class TransparencyAgencyPage implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(TransparencyService);
  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly grantor = signal<TransparencyGrantor | null>(null);
  readonly all = signal<TransparencyPartnership[]>([]);
  search = '';

  readonly filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.all();
    return this.all().filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.entity.toLowerCase().includes(q));
  });

  readonly totalGranted = computed(() => this.all().reduce((s, p) => s + (p.totalValue || 0), 0));

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('grantorId'));
    if (!id) { this.error.set(true); this.loading.set(false); return; }
    this.service.getByGrantor(id).subscribe({
      next: res => {
        this.grantor.set(res.grantor);
        this.all.set(res.partnerships);
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  money(v: number): string { return this.brl.format(v || 0); }
  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return statusClass(s); }
}
