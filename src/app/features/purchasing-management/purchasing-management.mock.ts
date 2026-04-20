// src/app/features/purchasing-management/purchasing-management.mock.ts
import { PurchasingReq } from './purchasing-management.model';

export const PURCHASING_MOCK: PurchasingReq[] = Array.from({ length: 25 }, (_, i) => ({
  id: `req-${i + 1}`,
  typeId: '0000',
  title: 'Exemplo',
  costCenter: 'Exemplo',
  group: 'Nome grupo',
  requester: 'Nome exemplo',
  stage: 'Exemplo',
  reqDate: '00/00/00',
  deliveryDate: '00/00/00',
  status: i % 4 === 1 || i % 4 === 3 ? 'CANCELLED' : 'ACTIVE',
}));