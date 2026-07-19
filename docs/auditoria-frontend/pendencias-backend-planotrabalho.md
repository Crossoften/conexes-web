# Demandas de Backend — Novo Plano de Trabalho (`/v1/work-plans`)

> Status atualizado conforme o **Swagger de homologação (última revisão)** cruzado com o
> front (construído front-first).
>
> Prioridades: **P0** bloqueante · **P1** essencial · **P2** desejável.

---

## ✅ Atendidos pelo backend (Swagger atual) — e o front já mira neles

| # | Demanda | Situação |
|---|---|---|
| **F1 / P0.1** | `applicationPlans` reescrito (9 colunas: linkedGoalId, linkedStepId, expenseItem, inKindPayment, expenseType, unit, quantity, unitValue, totalValue) | ✅ `CreateApplicationPlanDto` idêntico; front envia array estruturado |
| **L1 / P0.2** | `layout` (ordem/presença + blocos livres) | ✅ `CreateWorkPlanDto.layout: object`; front envia array `[{type,…}]` + conteúdo dos blocos livres. **Confirmado em runtime que aceita array.** |
| **M1** | `quantitativeMeta` number | ✅ number |
| **M3** | Logotipo da meta (`goals[].logoUrl`) | ✅ `logoUrl: string`; front liga o upload (Patch 46) |
| **D1/D2** | `reimbursements` com `installment` + `linkedGoalId` | ✅ `CreateReimbursementDto` completo |
| **PDF** | Exportar PDF por plano | ✅ `GET /v1/work-plans/{id}/pdf`; `service.exportPdf()` já usa |

---

## 🟡 Paliativos em uso (back ainda não tem array dedicado)

- **M2** `goals[].executionSteps` — DTO ainda `string`. Front serializa a tabela de etapas como **JSON-in-string**.
- **T1** `teamWorkContent` (Equipe) — `string`. Front serializa como **JSON-in-string**.
- **T2** `monitoringContent` (Monitoramento) — `string`. Front serializa como **JSON-in-string**.
- **E1/M4** `executada` — ainda **objeto único**; o bloco de Metas fala em "OSC Executante(s)" no plural. Se a regra exigir N executantes, virar `executadas: []`. **⚠️ confirmar regra.**

> Os paliativos funcionam (o back guarda/retorna a string intacta), mas o conteúdo não é
> consultável/relatável no back. Migrar para arrays dedicados é melhoria futura (T1/T2/M2).

---

## 🟠 Pendências abertas

### B-PT-01 🟠 · Coluna "Valor recebido" da listagem sem campo
- A listagem/detalhe **não tem** um campo de "valor recebido". O plano tem `repassValue`,
  `globalValue` e os `reimbursements` (desembolsos **programados**), mas não o **efetivamente
  recebido**.
- **Front (Patch 46):** a coluna fica `—` (não há o que exibir).
- **Ação sugerida:** se a regra exige exibir o recebido, o back precisa expor um campo
  (ex.: `receivedValue`) — provavelmente agregando pagamentos reais vinculados ao plano.

### P2.3 🟡 · Envelope das listagens (`GET /v1/work-plans`, `/dashboard`)
- Respostas `200:{}` (não tipadas no Swagger). Confirmar formato (`{data,count,pages}`) para
  paginação e o shape do dashboard (`stats`, `recentProposals`, `activePlans`).

---

## Observações do front (Patch 46)
- **Data início** formatada `dd/mm/aaaa` na lista.
- **Equipe** = contagem de membros (parse do `teamWorkContent`).
- **Status (proposta → plano ativo):** menu de ações com transições via `PATCH /{id} { status }`
  (Rascunho→Aguardando análise→Ativo→Concluído; Cancelar), **gateado a Admin/Master** (o back
  também deve validar o papel).
- **Logotipo da meta** (`goals[].logoUrl`) ligado ao `/upload/one-file`.
