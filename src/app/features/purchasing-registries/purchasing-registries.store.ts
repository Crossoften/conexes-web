// src/app/features/purchasing-registries/purchasing-registries.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { Product, Supplier, CostCenter, DeliveryLocation, RegistryTab, RegistryStatus } from './purchasing-registries.model';
import { PRODUCTS_MOCK, SUPPLIERS_MOCK, COST_CENTERS_MOCK, LOCATIONS_MOCK } from './purchasing-registries.mock';

interface State {
  products: Product[];
  suppliers: Supplier[];
  costCenters: CostCenter[];
  locations: DeliveryLocation[];
  loading: boolean;
  activeTab: RegistryTab;
  filters: { search: string; status: RegistryStatus | ''; type: string };
  sort: { column: string; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class PurchasingRegistriesStore {
  private readonly state = signal<State>({
    products: PRODUCTS_MOCK,
    suppliers: SUPPLIERS_MOCK,
    costCenters: COST_CENTERS_MOCK,
    locations: LOCATIONS_MOCK,
    loading: false,
    activeTab: 'PRODUCTS',
    filters: { search: '', status: '', type: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  readonly activeTab = computed(() => this.state().activeTab);
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly currentListItems = computed(() => {
    const tab = this.activeTab();
    if (tab === 'PRODUCTS') return this.state().products;
    if (tab === 'SUPPLIERS') return this.state().suppliers;
    if (tab === 'COST_CENTERS') return this.state().costCenters;
    return this.state().locations;
  });

  readonly filteredListItems = computed(() => {
    let result = this.currentListItems() as any[];
    const tab = this.activeTab();
    const f = this.filters();
    
    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item => {
        if (tab === 'PRODUCTS') return item.productName.toLowerCase().includes(term) || item.code.includes(term);
        if (tab === 'SUPPLIERS') return item.legalName.toLowerCase().includes(term) || item.cnpj.includes(term);
        return item.name.toLowerCase().includes(term) || item.address.toLowerCase().includes(term);
      });
    }
    
    // Status filter only applies to products in this mock setup
    if (f.status && tab === 'PRODUCTS') {
      result = result.filter(item => item.status === f.status);
    }
    
    return result;
  });

  readonly filteredTotal = computed(() => this.filteredListItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.filteredListItems().slice(start, start + pageSize);
  });

  // Tipagens específicas para o HTML (evita erros no strict mode)
  readonly pageProducts = computed(() => this.activeTab() === 'PRODUCTS' ? this.pageItems() as Product[] : []);
  readonly pageSuppliers = computed(() => this.activeTab() === 'SUPPLIERS' ? this.pageItems() as Supplier[] : []);
  readonly pageCostCenters = computed(() => this.activeTab() === 'COST_CENTERS' ? this.pageItems() as CostCenter[] : []);
  readonly pageLocations = computed(() => this.activeTab() === 'LOCATIONS' ? this.pageItems() as DeliveryLocation[] : []);

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every((item: any) => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some((item: any) => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // Updaters
  setTab(tab: RegistryTab) {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set(), filters: { search: '', status: '', type: '' }, pagination: { ...s.pagination, page: 1 } }));
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
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: any[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}