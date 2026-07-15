# Pendências de Back-end — Módulo Centro de Custo / Projeto / Atividade

> Auditoria Front × Back × Swagger × PDF.
> **O Front usa `/v1/projects`** (que cria CC ou Projeto conforme `type`). O `/v1/cost-centers` do Swagger **não é usado** pelo Front.
> Endpoints: `POST/GET /v1/projects`, `GET/PATCH/DELETE /v1/projects/{id}?entityType=...`, `GET /v1/projects/export/excel`.

---

## B-CC-01 🔴 ALTA — Suporte a "Atividade" (3º nível da hierarquia)
- **Doc do cliente:** cascata **Centro de Custo → Projeto → Atividade** (3 níveis).
- **Hoje:** `CreateProjectDto` tem `costCenterId` (Projeto → CC), mas **não há** `projectId` (Atividade → Projeto) nem tipo `atividade`.
- **Pedido:** permitir criar Atividade vinculada a um Projeto (campo `projectId`/parent) e reconhecer o `type='atividade'`. Sem isso, a cascata de 3 níveis e o "Adicionar Subnível (Atividade)" não funcionam.

## B-CC-02 🔴 ALTA — Valores canônicos de `type` + regra de criação frágil
- **Hoje:** a criação decide pelo `type`: `"centro_de_custo"` cria CostCenter; **qualquer outro valor** cria Project. Isso causou bug no Front (enviava `"Centro de Custos"` → criava Projeto por engano — já corrigido no Patch 08).
- **Pedido:** fixar/validar os valores canônicos (`centro_de_custo`, `projeto`, `atividade`) como enum; **migrar** registros legados com valores divergentes (ex.: `"Centro de Custos"`, `"Projeto"`).

## B-CC-03 🟠 MÉDIA — Endpoints duplicados `/v1/cost-centers` × `/v1/projects`
- **Hoje:** existem os dois; o Front consome só `/v1/projects`. `/v1/cost-centers` fica sem uso.
- **Pedido:** definir o endpoint canônico e depreciar/remover o duplicado (evita divergência de contrato).

## B-CC-04 🟠 MÉDIA — Schema de resposta e hierarquia não documentados
- **Hoje:** `findAll` retorna `200` sem schema. O Front espera `{ data, total }` e uma estrutura de hierarquia `groups[] → children[]` para a expansão em cascata.
- **Pedido:** documentar o DTO de resposta e **como a hierarquia é retornada** (o Front já tem o layout de expansão pronto; falta o Back devolver `groups/children` — CC → Projetos → Atividades).

## B-CC-05 🟡 MÉDIA — "Adicionar Subnível"
- **Projeto dentro de CC:** já suportado via `costCenterId` (Front implementado no Patch 09).
- **Atividade dentro de Projeto:** falta (ver B-CC-01).

## B-CC-06 🟡 MÉDIA — Cascata nos lançamentos financeiros
- **Doc:** em Contas a Pagar/Receber, o usuário seleciona **Centro de Custo → Projeto → Atividade** em cascata.
- **Pedido:** expor endpoints/estrutura para o Front montar os selects em cascata (filtrar projetos por `costCenterId`, atividades por `projectId`).

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-CC-01 (Atividade/3º nível), B-CC-02 (valores canônicos + migração) |
| 🟠 Média | B-CC-03 (endpoints duplicados), B-CC-04 (schema + hierarquia) |
| 🟡 Média | B-CC-05 (Adicionar Subnível Atividade), B-CC-06 (cascata financeira) |

### Notas de Front (não são Back)
- Modal em **modo visualização** tem um `<input formControlName="startDate">` fora de `[formGroup]` (resquício) — corrigir em patch futuro.
- Store com duplicação de fetch (A-CC-01) — refactor sugerido.
