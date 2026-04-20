export type StatusType = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ERROR';

export interface StatusUI {
  label: string;
  class: string;
}

export const STATUS_MAP: Record<StatusType, StatusUI> = {
  ACTIVE: {
    label: 'Ativo',
    class: 'status--green',
  },
  INACTIVE: {
    label: 'Inativo',
    class: 'status--red',
  },
  PENDING: {
    label: 'Pendente',
    class: 'status--yellow',
  },
  ERROR: {
    label: 'Erro',
    class: 'status--gray',
  },
};