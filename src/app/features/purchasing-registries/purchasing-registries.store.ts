// src/app/features/purchasing-registries/purchasing-registries.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { NotificationService } from '../../shared/services/notification.service';
import {
  Product, Supplier, CostCenter, DeliveryLocation,
  RegistryTab, RegistryStatus,
  ApiProductService, ApiStakeholder, ApiProject, ApiDeliveryLocation,
} from './purchasing-registries.model';
import { PurchasingRegistriesService } from './purchasing-registries.service';

interface State {
  products:    Product[];
  suppliers:   Supplier[];
  costCenters: CostCenter[];
  locations:   DeliveryLocation[];
  loading:     boolean;
  error:       string | null;
  activeTab:   RegistryTab;
  filters:     { search: string; status: RegistryStatus | '' };
  sort:        { column: string; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<string>;
}

// ── Mapeamentos API -> view ───────────────────────────────────────────────────
function toProduct(a: ApiProductService): Product {
  return {
    id: String(a.id), apiId: a.id,
    code: a.code ?? '—', productName: a.name,
    measureType: a.measure ?? '—', group: a.productGroup?.name ?? a.group ?? '—', manufacturer: a.manufacturerRef?.name ?? a.manufacturer ?? '—',
    description: a.description ?? '—', status: a.status ?? 'Active',
  };
}
function toSupplier(a: ApiStakeholder): Supplier {
  return { id: String(a.id), apiId: a.id, cnpj: a.document ?? '—', legalName: a.name, contact: a.phone ?? '—', email: a.email ?? '—' };
}
function toCostCenter(a: ApiProject): CostCenter {
  return { id: String(a.id), apiId: a.id, name: a.name, address: a.description ?? '—' };
}
function toLocation(a: ApiDeliveryLocation): DeliveryLocation {
  const addr = [a.address, a.number].filter(Boolean).join(', ');
  return { id: String(a.id), apiId: a.id, name: a.name, address: addr || '—' };
}

@Injectable()
export class PurchasingRegistriesStore {
  private svc    = inject(PurchasingRegistriesService);
  private notify = inject(NotificationService);

  private readonly state = signal<State>({
    products: [], suppliers: [], costCenters: [], locations: [],
    loading: false, error: null,
    activeTab: 'PRODUCTS',
    filters: { search: '', status: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  readonly activeTab   = computed(() => this.state().activeTab);
  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly currentListItems = computed<(Product | Supplier | CostCenter | DeliveryLocation)[]>(() => {
    switch (this.activeTab()) {
      case 'PRODUCTS':
      case 'SERVICES':     return this.state().products;
      case 'SUPPLIERS':    return this.state().suppliers;
      case 'COST_CENTERS': return this.state().costCenters;
      default:             return this.state().locations;
    }
  });

  readonly filteredListItems = computed(() => {
    const tab = this.activeTab();
    const { search, status } = this.filters();
    let result = this.currentListItems();

    if (search) {
      const t = search.toLowerCase();
      result = result.filter(item => {
        if (tab === 'PRODUCTS' || tab === 'SERVICES')  { const p = item as Product;  return p.productName.toLowerCase().includes(t) || p.code.toLowerCase().includes(t); }
        if (tab === 'SUPPLIERS') { const s = item as Supplier; return s.legalName.toLowerCase().includes(t) || s.cnpj.toLowerCase().includes(t); }
        const n = item as CostCenter | DeliveryLocation; return n.name.toLowerCase().includes(t) || n.address.toLowerCase().includes(t);
      });
    }
    if (status && (tab === 'PRODUCTS' || tab === 'SERVICES')) {
      result = result.filter(item => (item as Product).status === status);
    }
    return result;
  });

  readonly sortedListItems = computed(() => {
    const { column, direction } = this.sort();
    const items = this.filteredListItems();
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const va = (a as any)[column], vb = (b as any)[column];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly filteredTotal = computed(() => this.filteredListItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.sortedListItems().slice(start, start + pageSize);
  });

  readonly pageProducts    = computed(() => (this.activeTab() === 'PRODUCTS' || this.activeTab() === 'SERVICES') ? this.pageItems() as Product[]          : []);
  readonly pageSuppliers   = computed(() => this.activeTab() === 'SUPPLIERS'    ? this.pageItems() as Supplier[]         : []);
  readonly pageCostCenters = computed(() => this.activeTab() === 'COST_CENTERS' ? this.pageItems() as CostCenter[]       : []);
  readonly pageLocations   = computed(() => this.activeTab() === 'LOCATIONS'    ? this.pageItems() as DeliveryLocation[] : []);

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });
  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // ── Load por aba ────────────────────────────────────────────────────────────
  load(): void {
    const tab = this.activeTab();
    this.state.update(s => ({ ...s, loading: true, error: null }));
    const fail = (err: { error?: { message?: string } }) =>
      this.state.update(s => ({ ...s, loading: false, error: err?.error?.message ?? 'Erro ao carregar os cadastros.' }));

    switch (tab) {
      case 'PRODUCTS':
        this.svc.listProducts({ take: 500, type: 'Product' }).subscribe({
          next: res => this.state.update(s => ({ ...s, products: res.data.map(toProduct), loading: false })), error: fail });
        break;
      case 'SERVICES':
        // CMP-09: aba própria de Serviços (mesma tabela, filtrada por type=Service).
        this.svc.listProducts({ take: 500, type: 'Service' }).subscribe({
          next: res => this.state.update(s => ({ ...s, products: res.data.map(toProduct), loading: false })), error: fail });
        break;
      case 'SUPPLIERS':
        this.svc.listSuppliers({ take: 500 }).subscribe({
          next: res => this.state.update(s => ({ ...s, suppliers: res.data.map(toSupplier), loading: false })), error: fail });
        break;
      case 'COST_CENTERS':
        this.svc.listCostCenters({ take: 500 }).subscribe({
          next: res => this.state.update(s => ({ ...s, costCenters: res.data.map(toCostCenter), loading: false })), error: fail });
        break;
      default:
        this.svc.listLocations({ take: 500 }).subscribe({
          next: res => this.state.update(s => ({ ...s, locations: res.data.map(toLocation), loading: false })), error: fail });
    }
  }

  // ── Updaters ────────────────────────────────────────────────────────────────
  setTab(tab: RegistryTab): void {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set(), filters: { search: '', status: '' }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setSearch(search: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } })); }
  setStatus(status: RegistryStatus | '') { this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } })); }

  setSort(column: string) {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); }

  toggleRow(id: string) {
    this.state.update(s => {
      const next = new Set(s.selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...s, selectedIds: next };
    });
  }

  toggleAllPage(items: { id: string }[]) {
    this.state.update(s => {
      const next = new Set(s.selectedIds);
      const all = items.every(i => next.has(i.id));
      items.forEach(i => all ? next.delete(i.id) : next.add(i.id));
      return { ...s, selectedIds: next };
    });
  }

  // ── Exclusão (Produtos e Locais) ────────────────────────────────────────────
  // CP-04: exclusão com feedback claro (sucesso e erro), sem falha silenciosa.
  removeProduct(apiId: number) {
    this.svc.deleteProduct(apiId).subscribe({
      next: () => { this.notify.success('Item excluído.'); this.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Não foi possível excluir. O item pode estar em uso.'),
    });
  }
  removeLocation(apiId: number) {
    this.svc.deleteLocation(apiId).subscribe({
      next: () => { this.notify.success('Local excluído.'); this.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Não foi possível excluir o local. Ele pode estar em uso.'),
    });
  }
}
