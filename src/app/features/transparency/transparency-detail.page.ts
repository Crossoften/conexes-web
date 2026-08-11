// features/transparency/transparency-detail.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TransparencyService, TransparencyDetail } from './transparency.service';
import { STATUS_LABELS, statusClass } from './transparency.util';

@Component({
  selector: 'app-transparency-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './transparency-detail.page.html',
  styleUrl: './transparency.scss',
})
export class TransparencyDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(TransparencyService);
  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<TransparencyDetail | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error.set(true); this.loading.set(false); return; }
    this.service.getById(id).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  money(v: number): string { return this.brl.format(v || 0); }
  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return statusClass(s); }
}
