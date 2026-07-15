// src/app/features/cost-centers/cost-centers.model.ts

export type CostCenterStatus = 'Active' | 'Inactive';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface LinkedAccount {
  origin:        string;
  accountPlanId: number;
}

export interface CostCenterChild {
  id:          number;
  code:        string;
  name:        string;
  description: string;
  status:      CostCenterStatus;
}

export interface CostCenterGroup {
  id:       number;
  code:     string;
  name:     string;
  children: CostCenterChild[];
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface CostCenter {
  id:                   number;
  code:                 string;
  name:                 string;   // centros de custo
  title?:               string;   // projetos retornam title
  type:                 string;
  _entityType?:         'cost_center' | 'project'; // indicador autoritativo do back (qual tabela)
  description:          string;
  status:               CostCenterStatus;
  accountingCode:       string;
  payingSource:         string;
  startDate:            string;
  categoryDescription:  string;
  restrictInterestFine: boolean;
  restrictBudget:       boolean;
  costCenterId:         number | null;
  linkedAccounts:       LinkedAccount[];
  groups?:              CostCenterGroup[];
  _children?:           CostCenter[]; // subníveis (projetos) montados no Front para a expansão
  createdAt?:           string;
  updatedAt?:           string;
}

// ── Payload de criação/edição ─────────────────────────────────────────────────

export interface CostCenterPayload {
  code:                 string;
  name:                 string;
  type:                 string;
  description:          string;
  status:               CostCenterStatus;
  accountingCode:       string;
  payingSource:         string;
  startDate:            string | null;
  categoryDescription:  string;
  restrictInterestFine: boolean;
  restrictBudget:       boolean;
  costCenterId:         number | null;
  linkedAccounts:       LinkedAccount[];
}

// ── Filtros para listagem server-side ─────────────────────────────────────────

export interface CostCenterListParams {
  name?: string;
  type?: string;
  skip?: number;
  take?: number;
}

// ── Resposta paginada da API ──────────────────────────────────────────────────

export interface CostCenterListResponse {
  data:  CostCenter[];
  total: number;
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const COST_CENTER_STATUS_CONFIG: Record<CostCenterStatus, StatusConfig> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};

// Rótulos do Tipo. Valores canônicos: centro_de_custo | projeto | atividade.
// Inclui variantes legadas já gravadas para exibir rótulo amigável.
export const COST_CENTER_TYPE_LABELS: Record<string, string> = {
  centro_de_custo:     'Centro de Custo',
  projeto:             'Projeto',
  atividade:           'Atividade',
  // legado
  'Centro de Custos':  'Centro de Custo',
  'Projeto':           'Projeto',
};

// ── Helper: deriva entityType a partir do campo type ─────────────────────────

export function toEntityType(type: string): 'cost_center' | 'project' {
  return type === 'centro_de_custo' ? 'cost_center' : 'project';
}

/**
 * Resolve o entityType de um registro para as operações (get/update/delete).
 * Prioriza o `_entityType` autoritativo retornado pelo back (que sabe em qual
 * tabela o registro vive); só cai no texto `type` como último recurso. Isso evita
 * 404 em registros legados com `type` inconsistente.
 */
export function resolveEntityType(
  item: { type?: string; _entityType?: 'cost_center' | 'project' | null } | null | undefined,
): 'cost_center' | 'project' {
  if (item?._entityType === 'cost_center' || item?._entityType === 'project') {
    return item._entityType;
  }
  return toEntityType(item?.type ?? '');
}