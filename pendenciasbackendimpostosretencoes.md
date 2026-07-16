# Pendências de Back-end — Módulo Impostos e Retenções (`/v1/tax-service`)

> Auditoria Front × Back × Swagger × PDF ("Cadastro de Retenção de Serviços").
> Endpoints: `POST /v1/tax-service` (createOrUpdate), `GET /v1/tax-service` (findAll),
> `GET /v1/tax-service/stakeholder/{id}`, `DELETE /v1/tax-service/{id}`, `GET /export/excel`.

---

## B-TX-01 🔴 ALTA — CRUD incompleto / edição via POST
- **Hoje:** não há `GET /v1/tax-service/{id}` nem `PATCH /v1/tax-service/{id}`. O único write é `POST` (createOrUpdate = upsert por `stakeholderId`).
- **Sintoma:** o Front chamava `PATCH /{id}` na edição → falharia. **Corrigido no Patch 14** (edição via POST/upsert).
- **Pedido:** confirmar/documentar que edição é via POST (upsert). Idealmente expor `GET /{id}` para consistência.

## B-TX-07 🔴 ALTA — Fonte da verdade dos impostos: `/tax-service` × `stakeholder.taxesAndServices`
- **Contexto:** os impostos do fornecedor existem em **dois lugares**: embutidos no cadastro do fornecedor (`stakeholder.taxesAndServices`, decisão do cliente de manter) **e** nesta tela dedicada (`/v1/tax-service`).
- **Decisão do cliente:** manter em ambos, **sincronizados** — o que estiver preenchido em um aparece no outro.
- **Front (Patch 15):** ao selecionar o fornecedor na tela de impostos, **puxa** `stakeholder.taxesAndServices` para pré-preencher (direção stakeholder → tela de impostos).
- **Pedido ao Back (direção inversa / consistência):** garantir que **salvar em `/tax-service` reflita** em `stakeholder.taxesAndServices` (e vice-versa) — ideal **uma única fonte** compartilhada, ou sincronização no servidor. Sem isso, o "vice-versa" fica só no Back.

## B-TX-02 🟠 MÉDIA — `findAll` sem filtros/paginação e resposta sem schema
Adicionar `status`, `search`, `take`, `skip`; documentar a resposta (traz `status`? nome do fornecedor?). Hoje o Front faz filtro/paginação client-side.

## B-TX-03 🟠 MÉDIA — "Natureza da Operação → impostos aplicáveis"
O PDF pede uma **busca por natureza da operação** que **auto-preenche** as alíquotas aplicáveis. Não há endpoint. Pedido: criar (ex.: `GET /v1/tax-service/operation-nature?q=...` → alíquotas).

## B-TX-04 🟡 MÉDIA — Campo `status`
O contrato do tax-service **não tem `status`**; o doc pede filtro Ativos/Inativos. Adicionar `status` ou confirmar que não existe (nesse caso o Front remove o filtro).

## B-TX-05 🟡 MÉDIA — Regra do "Total das Retenções"
- **Front (Patch 14):** calcula uma **soma simples** das alíquotas (IRRF+PIS+PCC+COFINS+INSS+CSLL+**IBS+CBS**) — provisório, conforme decisão do cliente.
- **Pedido:** definir a regra oficial (quais tributos entram, se é % ou valor, base de cálculo) para alinharmos.

## B-TX-06 🟡 MÉDIA — `activityId` no serviço (Atividade)
`CreateStakeholderServiceDto` tem `costCenterId`/`projectId` mas **não `activityId`**; o PDF (pág. 3) pede vínculo a "PROJETO, ATIVIDADE". Adicionar (liga-se ao **B-CC-01**).

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-TX-01 (CRUD/POST), B-TX-07 (fonte da verdade / sync) |
| 🟠 Média | B-TX-02 (filtros/schema), B-TX-03 (natureza→impostos) |
| 🟡 Média | B-TX-04 (status), B-TX-05 (regra do total), B-TX-06 (activityId) |

### Notas
- **IBS e CBS** são mantidos nas alíquotas (decisão do cliente), mesmo não estando no PDF. Já presentes no contrato (`ibsAliquot`/`cbsAliquot`).
- Serviços vinculados (Órgão concessor, Centro de Custo, Projeto) hoje são preenchidos como ID/texto manual no Front — deveriam ser **selects** (acoplamento a grantors/cost-centers/projects) — pendência de **Front** para quando os contratos estiverem definidos.
