// src/app/features/taxes/taxes.mock.ts
import { Tax } from './taxes.model';

export const TAXES_MOCK: Tax[] = Array.from({ length: 25 }, (_, i) => ({
  id: `tax-${i + 1}`,
  code: '000000000',
  provider: 'VITTAJOB MEDICINA LTDA',
  service: 'HOSPITAIS, CLINICAS, LABORATORIOS, CASA SAUDE',
  totalRetentions: 'R$ 0,00', // Valor de exemplo, já que na imagem mostrava "Ativo" aqui
  status: i % 5 === 0 ? 'INACTIVE' : 'ACTIVE', // Cria alguns inativos para teste
}));