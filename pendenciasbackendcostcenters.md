# Pendências de Back-end — Módulo Centro de Custo / Projeto / Atividade

> Auditoria Front × Back × Swagger × PDF.
> **O Front usa `/v1/projects`** (cria CC ou Projeto conforme `type`). O `/v1/cost-centers` do Swagger **não é usado**.
> Endpoints: `POST/GET /v1/projects`, `GET/PATCH/DELETE /v1/projects/{id}?entityType=...`, `GET /v1/projects/export/excel`.

---

## B-CC-01 🔴 ALTA — Suporte a "Atividade" (3º nível)
Doc pede cascata **Centro de Custo → Projeto → Atividade**. Hoje `CreateProjectDto` tem `costCenterId` (Projeto → CC) mas **não** há `projectId` (Atividade → Projeto) nem tipo `atividade`. Pedido: permitir criar Atividade vinculada a um Projeto e reconhecer `type='atividade'`.

## B-CC-02 🔴 ALTA — Valores canônicos de `type` + regra de criação frágil
A criação decide pelo texto: `"centro_de_custo"` cria CC; qualquer outro valor cria Project (causou bug no Front — corrigido no Patch 08). Pedido: fixar enum (`centro_de_custo`, `projeto`, `atividade`) e **migrar** registros legados (`"Centro de Custos"`, `"Projeto"` etc.).

## B-CC-04 🔴 ALTA — Hierarquia + paginação da listagem (REFORÇADO)
- **Hoje:** `findAll` devolve **tudo plano** (CCs, Projetos e — futuramente — Atividades como linhas soltas), sem schema documentado. O Front **monta a árvore client-side** agrupando os projetos sob o CC pai via `costCenterId` (Patches 12/13).
- **Problema:** o agrupamento só funciona dentro da **página atual**. Se um CC e seus projetos caírem em páginas diferentes (paginação plana), o vínculo visual quebra; e a contagem/`total` mistura níveis.
- **Pedido (uma das opções):**
  1. Devolver a **hierarquia pronta** (cada CC com seus `children`/projetos, e cada projeto com suas atividades); **ou**
  2. **Paginar por nível-topo** (apenas Centros de Custo), trazendo os projetos/atividades aninhados de cada CC.
- Documentar o DTO de resposta (`{ data, total }` + estrutura aninhada).

## B-CC-07 🟠 MÉDIA — `_entityType` sempre presente e consistente (NOVO)
- O Front usa o campo **`_entityType`** (`cost_center` | `project`) de cada item para: (a) resolver o `entityType` correto no `update`/`delete` — **foi a causa do 404** (Patch 11); e (b) montar a árvore.
- **Pedido:** garantir que **todo** item do `findAll` (e do detalhe) traga `_entityType` de forma consistente (incluindo `atividade` no futuro). Se o campo faltar, o Front cai no fallback por texto — que é justamente o que falha em dados legados.

## B-CC-08 🟢 BAIXA — Datas opcionais devem aceitar `null`/omissão (NOVO)
- O `PATCH`/`POST` rejeitou `startDate: ""` com `400 "startDate must be a valid ISO 8601 date string"`.
- **Pedido:** campos de data **opcionais** devem aceitar `null` ou ausência do campo (não exigir ISO quando vazio). Já contornado no Front (envia `null`), mas convém padronizar no contrato.

## B-CC-03 🟠 MÉDIA — Endpoints duplicados `/v1/cost-centers` × `/v1/projects`
O Front usa só `/v1/projects`; `/v1/cost-centers` fica sem uso. Definir o canônico e depreciar o outro.

## B-CC-05 🟡 MÉDIA — "Adicionar Subnível"
Projeto dentro de CC: já suportado via `costCenterId` (Front no Patch 09). Atividade dentro de Projeto: falta (ver B-CC-01).

## B-CC-06 🟡 MÉDIA — Cascata nos lançamentos financeiros
Em Contas a Pagar/Receber, selecionar **CC → Projeto → Atividade** em cascata. Expor estrutura/filtros (projetos por `costCenterId`, atividades por `projectId`).

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-CC-01 (Atividade), B-CC-02 (valores canônicos + migração), **B-CC-04 (hierarquia + paginação)** |
| 🟠 Média | B-CC-03 (endpoints duplicados), **B-CC-07 (_entityType consistente)** |
| 🟡 Média/Baixa | B-CC-05, B-CC-06, **B-CC-08 (datas null)** |

### Notas de Front (não são Back)
- Modal em **modo visualização** tem um `<input formControlName="startDate">` fora de `[formGroup]` (resquício) — corrigir em patch futuro.
- Store com duplicação de fetch (A-CC-01) — refactor sugerido.

### Changelog
- **v2** — reforço de B-CC-04 (paginação vs hierarquia, após Patches 12/13); adicionados B-CC-07 (`_entityType`, após 404/Patch 11) e B-CC-08 (datas null, após Patch 10).
- **v1** — B-CC-01..06 iniciais.
