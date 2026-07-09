# Parcerias (Repasses) — Demandas de Backend

> Somente os itens que **exigem alteração no backend** para a tela "Repasses e
> Informações da Parceria" atender ao documento funcional. Os ajustes de frontend
> (selects de Tipo de Contratualização / Fonte de Recurso / Tipo de Validação e o
> "Visualizar" somente-leitura) são feitos no front, sem depender daqui.
>
> Prioridade: **P0** bloqueia o escopo · **P1** essencial · **P2** fluxo secundário.

---

## P0.1 · Repasse por **Competência** (não por parcela numerada)
- **DTO:** `CreatePartnershipPayableDto` = `{ installment (number), dueDate, value }`.
- **Doc:** o cronograma é **por competência (mês: janeiro…dezembro)** e **não** usa
  numeração "1º/2º/3º repasse". Colunas: **Competência · Data prevista · Valor previsto**.
- **Alteração sugerida:** adicionar `competency` ao payable (enum de mês
  `January…December` ou string), podendo substituir `installment`.
  ```
  competency: 'January' | ... | 'December'   // ou string "Janeiro"
  dueDate:    string     // data prevista para repasse
  value:      number     // valor previsto
  ```
- **Impacto:** sem isso, a competência do repasse não persiste.

## P0.2 · **Anexos com arquivo + descrição** (endpoint inexistente)
- **Doc:** tela de Anexos onde o usuário sobe **arquivos** com **descrição** (contrato
  assinado, CNDs, etc.), consultáveis depois (auditoria).
- **Situação:** o `GET /v1/partnerships/{id}` já retorna `files: []`, mas **não há
  endpoint** para gravar/listar esses arquivos.
- **Alteração sugerida:** espelhar o padrão de Compras:
  - `POST   /v1/partnerships/{id}/files`  body `{ fileUrl, fileKey, description }`
  - `GET    /v1/partnerships/{id}/files`
  - `DELETE /v1/partnerships/{id}/files/{fileId}`
- **Observação:** confirmar se o bloco atual `annexes[]` (metadados: `printDate`,
  `deadlineDate`, `validationType`) é **mantido** ou **substituído** por esta tela.

## P1.1 · Configuração do cronograma (para recarregar na edição)
- **Doc:** Tipo de recebimento (**Único / Recorrente**), **Número de repasses** e flag
  **"Definir valor e data manualmente"** governam a geração do cronograma.
- **Situação:** não existem no DTO.
- **Alteração sugerida (opcional):** `receiptType ('Single'|'Recurring')`,
  `installmentsCount (number)`, `manualSchedule (boolean)`.
- **Front-first:** se não vier, o front trata como UI e reconstrói a config a partir da
  tabela salva (perde-se apenas o "modo" original).

## P1.2 · Exclusão/inativação **restrita** (autorização de superior)
- **Doc:** excluir/inativar contrato **não** pode ser feito livremente — exige
  autorização de um superior.
- **Alteração sugerida:** regra de permissão/aprovação no backend para `DELETE`
  (e/ou mudança de status para inativo). Front apenas exibe/gateia conforme a permissão.

## P2.1 · Adicionar novo **instrumento** (aditamentos / apostilamentos)
- **Doc:** incluir instrumentos vinculados ao contrato (aditamentos, apostilamentos).
- **Alteração sugerida:** modelar sub-entidade `instruments` do contrato + endpoints
  (`POST/GET /v1/partnerships/{id}/instruments`), com tipo (aditamento/apostilamento),
  data, objeto e eventuais alterações de valor/prazo.

## P2.2 · **Integrar com o financeiro** (contas a receber)
- **Doc:** ação para integrar o contrato ao módulo financeiro (contas a receber).
- **Alteração sugerida:** endpoint/fluxo que gere lançamentos de **contas a receber** a
  partir do cronograma de repasses do contrato.

## P2.3 · **Visualizar recebimentos**
- **Doc:** consultar os recebimentos associados ao contrato.
- **Alteração sugerida:** `GET /v1/partnerships/{id}/receivables` (ou similar) retornando
  os recebimentos vinculados (valor, data, status).

---

## Resumo
| # | Prio | Demanda |
|---|---|---|
| P0.1 | 🔴 | `competency` (mês) no payable de repasse |
| P0.2 | 🔴 | Endpoint de arquivos por parceria (`/files`) |
| P1.1 | 🟠 | Campos de config do cronograma (receiptType/count/manual) |
| P1.2 | 🟠 | Exclusão/inativação com autorização de superior |
| P2.1 | 🟡 | Instrumentos (aditamentos/apostilamentos) |
| P2.2 | 🟡 | Integração com contas a receber |
| P2.3 | 🟡 | Consulta de recebimentos do contrato |
