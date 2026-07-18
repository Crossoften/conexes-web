# Parcerias (Repasses) — Demandas de Backend

> Somente os itens que **exigem alteração no backend** para a tela "Repasses e
> Informações da Parceria" atender ao documento funcional. Os ajustes de frontend
> (selects de Tipo de Contratualização / Fonte de Recurso / Tipo de Validação, o
> "Visualizar" somente-leitura, o cronograma por competência, as ações da lista e a
> tela de anexos) são feitos no front, sem depender daqui.
>
> Prioridade: **P0** bloqueia o escopo · **P1** essencial · **P2** fluxo secundário.
>
> **Status atualizado conforme o Swagger de homologação (última revisão).**

---

## ✅ Atendidos pelo backend (Swagger atual)

### P0.1 · Repasse por **Competência** — ATENDIDO
- `CreatePartnershipPayableDto` agora tem **`competency`** (string, ex.: `January…December`),
  além de `installment`, `dueDate`, `value`.
- **Front:** o cronograma envia `competency` em **inglês** (`January…December`), exibindo o
  mês em PT na tela. Coluna Competência (select mês) + Data prevista + Valor previsto.

### P0.2 · **Anexos com arquivo + descrição** — ATENDIDO
- Endpoints disponíveis:
  - `POST   /v1/partnerships/{id}/files`  body `CreatePartnershipFileDto { fileUrl*, fileKey*, description }`
  - `GET    /v1/partnerships/{id}/files`
  - `DELETE /v1/partnerships/{id}/files/{fileId}`
- **Front:** aba Anexos com upload (`/upload/one-file` → `fileUrl`/`fileKey`) + descrição +
  lista/remover.

### P1.2 · Exclusão/inativação **restrita** — ATENDIDO
- `DELETE /v1/partnerships/{id}` — "requer autorização de **Admin/Master**".
- **Front:** ação Excluir no menu (⋯) gateada por papel Admin/Master; 403 tratado.

---

## 🟠 Pendências abertas no backend

### B-PA-01 🟠 · `contractCode` não vem preenchido na listagem
- A resposta de `GET /v1/partnerships` traz o campo **`contractCode`**, porém retorna
  **`null`** em todos os registros. A coluna "COD contrato" da lista fica vazia.
- **Ação sugerida:** popular/projetar `contractCode` na listagem (número/código do contrato).
- **Front:** já lê `p.contractCode`; preenche sozinho assim que o back retornar o valor.
- **Observação:** `receivedValue` e `balanceValue` **já vêm** na listagem e passaram a ser
  exibidos nas colunas "Valor Recebido" e "Saldo" (não eram usados antes).

### P1.1 🟠 · Configuração do cronograma (para recarregar na edição) — opcional
- **Doc:** Tipo de recebimento (**Único / Recorrente**), **Número de repasses** e flag
  **"Definir valor e data manualmente"** governam a geração do cronograma.
- **Situação:** não existem no DTO (`CreatePartnershipDto`/`UpdatePartnershipDto`).
- **Alteração sugerida (opcional):** `receiptType ('Single'|'Recurring')`,
  `installmentsCount (number)`, `manualSchedule (boolean)`.
- **Front-first:** hoje o front reconstrói a config a partir da tabela salva (perde-se
  apenas o "modo" original).

### P2.1 🟡 · Adicionar novo **instrumento** (aditamentos / apostilamentos)
- **Doc:** incluir instrumentos vinculados ao contrato (aditamentos, apostilamentos).
- **Situação:** sem endpoint no Swagger.
- **Alteração sugerida:** sub-entidade `instruments` do contrato + endpoints
  (`POST/GET /v1/partnerships/{id}/instruments`), com tipo, data, objeto e eventuais
  alterações de valor/prazo.
- **Front:** ação "Adicionar novo instrumento" no menu (⋯) já existe, **visível e inerte**
  (aviso "em desenvolvimento") até o endpoint existir.

### P2.2 🟡 · **Integrar com o financeiro** (contas a receber)
- **Doc:** ação para integrar o contrato ao módulo financeiro (contas a receber).
- **Situação:** sem endpoint dedicado. Existe `POST /v1/accounts-receivable`, mas não há
  fluxo que gere as parcelas a partir do cronograma de repasses do contrato.
- **Alteração sugerida:** endpoint/fluxo que gere lançamentos de **contas a receber** a
  partir do cronograma de repasses.
- **Front:** ação no menu (⋯) já existe, **visível e inerte**.

### P2.3 🟡 · **Visualizar recebimentos**
- **Doc:** consultar os recebimentos associados ao contrato.
- **Situação:** sem endpoint no Swagger.
- **Alteração sugerida:** `GET /v1/partnerships/{id}/receivables` (ou similar) retornando os
  recebimentos vinculados (valor, data, status).
- **Front:** ação no menu (⋯) já existe, **visível e inerte**.

---

## Resumo
| # | Prio | Demanda | Situação |
|---|---|---|---|
| P0.1 | 🔴 | `competency` (mês) no payable | ✅ atendido |
| P0.2 | 🔴 | Endpoint de arquivos por parceria (`/files`) | ✅ atendido |
| P1.2 | 🟠 | Exclusão com autorização (Admin/Master) | ✅ atendido |
| B-PA-01 | 🟠 | `contractCode` null na listagem | ⏳ aberto |
| P1.1 | 🟠 | Config do cronograma (receiptType/count/manual) | ⏳ aberto (opcional) |
| P2.1 | 🟡 | Instrumentos (aditamentos/apostilamentos) | ⏳ aberto |
| P2.2 | 🟡 | Integração com contas a receber | ⏳ aberto |
| P2.3 | 🟡 | Consulta de recebimentos do contrato | ⏳ aberto |
