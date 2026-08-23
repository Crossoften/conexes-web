// src/app/features/quotation-map/quotation-map.page.ts
// Feature 3 (front): Mapa de Cotação — comparar propostas + gerar convites do Portal.
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Req { id: number; title: string; }
interface Supp { id: number; name: string; }

@Component({
  selector: 'app-quotation-map',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quotation-map.page.html',
  styleUrl: './quotation-map.page.scss',
})
export class QuotationMapPage implements OnInit {
  private http = inject(HttpClient);
  private api = environment.apiUrl + '/v1';
  private portalBase = 'https://homolog.crosoften.com/cotacao/?t=';

  readonly requests = signal<Req[]>([]);
  readonly suppliers = signal<Supp[]>([]);
  readonly selectedRequestId = signal<number | null>(null);
  readonly map = signal<any | null>(null);
  readonly selectedSuppliers = signal<Set<number>>(new Set());
  readonly invites = signal<{ supplierId: number; supplierName: string; link: string }[]>([]);
  readonly loadingMap = signal(false);
  readonly generating = signal(false);
  readonly copied = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/purchases/requests?take=1000`).subscribe({
      next: r => this.requests.set((r?.data ?? []).map((x: any) => ({ id: x.id, title: x.title || `Requisição #${x.id}` }))),
      error: () => {},
    });
    this.http.get<any>(`${this.api}/stakeholders?take=1000`).subscribe({
      next: r => this.suppliers.set((r?.data ?? []).filter((s: any) => s.type === 'Supplier').map((s: any) => ({ id: s.id, name: s.name }))),
      error: () => {},
    });
  }

  onSelectRequest(id: any): void {
    const rid = Number(id) || null;
    this.selectedRequestId.set(rid);
    this.map.set(null);
    this.invites.set([]);
    if (rid) this.loadMap(rid);
  }

  private loadMap(id: number): void {
    this.loadingMap.set(true);
    this.http.get<any>(`${this.api}/quotation-map/${id}`).subscribe({
      next: m => { this.map.set(m); this.loadingMap.set(false); },
      error: () => { this.loadingMap.set(false); },
    });
  }

  isSupplierChecked(id: number): boolean { return this.selectedSuppliers().has(id); }
  toggleSupplier(id: number): void {
    const next = new Set(this.selectedSuppliers());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedSuppliers.set(next);
  }

  generateInvites(): void {
    const rid = this.selectedRequestId();
    const ids = [...this.selectedSuppliers()];
    if (!rid || !ids.length) return;
    this.generating.set(true);
    this.http.post<any>(`${this.api}/quotation-invites`, { purchaseRequestId: rid, supplierIds: ids }).subscribe({
      next: res => {
        const byId = new Map(this.suppliers().map(s => [s.id, s.name]));
        this.invites.set((res?.invites ?? []).map((i: any) => ({
          supplierId: i.supplierId,
          supplierName: byId.get(i.supplierId) ?? `Fornecedor #${i.supplierId}`,
          link: this.portalBase + i.token,
        })));
        this.generating.set(false);
      },
      error: () => { this.generating.set(false); },
    });
  }

  copy(link: string): void {
    navigator.clipboard?.writeText(link);
    this.copied.set(link);
    setTimeout(() => this.copied.set(null), 1500);
  }

  brl(v: number): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
