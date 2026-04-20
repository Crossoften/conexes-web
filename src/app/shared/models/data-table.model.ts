export interface TableAction<T> {
  label: string;
  icon?: string;
  action: (row: T) => void;
}