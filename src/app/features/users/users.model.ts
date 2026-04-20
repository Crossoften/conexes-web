// src/app/features/users/users.model.ts
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  company: string;
  login: string;
  email: string;
  permissions: string;
  status: UserStatus;
}

export const USER_STATUS_CONFIG: Record<UserStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger' },
};