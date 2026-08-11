// src/app/features/transparency/transparency.util.ts

export const STATUS_LABELS: Record<string, string> = {
  Open: 'Em prestação',
  Approved: 'Aprovada',
  Returned: 'Devolvida',
  None: 'Sem prestação',
};

export function statusClass(status: string): string {
  if (status === 'Approved') return 'pill--success';
  if (status === 'Returned') return 'pill--danger';
  if (status === 'Open') return 'pill--info';
  return 'pill--neutral';
}
