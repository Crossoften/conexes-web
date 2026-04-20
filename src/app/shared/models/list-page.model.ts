export interface ListPageConfig<T extends Record<string, any>>  {
  title: string;
   toolbar?: ListToolbarAction[];

  createLabel?: string;
  onCreate?: () => void;

  filters: FilterConfig[];

  columns: TableColumn<T>[];

  fetch: (params: ListParams) => Promise<Page<T>>;

  actions?: TableAction<T>[];
}

export interface ListToolbarAction {
  label: string;
  icon?: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  filters?: Record<string, any>;
}

export interface Page<T> {
  data: T[];
  total: number;
}

export interface FilterConfig {
  key: string;
  type: 'search' | 'select';
  label?: string;
  options?: { label: string; value: any }[];
}

export interface TableColumn<T extends Record<string, any>> {
  key: keyof T;
  label: string;
  type?: 'text' | 'status';
}

export interface TableAction<T extends Record<string, any>>{
  label: string;
  icon?: string;
  action: (row: T) => void;
}