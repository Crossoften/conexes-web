# Revisão da Tela "Repasses e Informações da Parceria" — doc × implementação

> Cruzamento do documento funcional enviado com o **form atual**, o
> `CreatePartnershipDto`/`GET /{id}` e o Swagger. Classificação: **FE** = ajuste de
> frontend (DTO já suporta) · **BE** = demanda de backend.

## 1. Campos que viram SELECT (hoje são texto livre) — Frontend

### FE1 · Tipo de Contratualização (Modalidade do Contrato)
- **Hoje:** input de texto (`tipoContratualizacao` → `contractingType`).
- **Doc:** dropdown com opções fixas: **Acordo de Cooperação · Auxílio · Contrato de Gestão
  · Contribuição · Termo de Convênio · Subvenção · Termo de Colaboração · Termo de Fomento
  · Termo de Parceria**.
- **Ação:** converter para `<select>` com essas 9 opções. `contractingType` é string → **sem backend**.

### FE2 · Fonte de Recurso (Municipal / Estadual / Federal)
- **Hoje:** 3 inputs de texto (`fonteRecurso*` → `municipalSource/stateSource/federalSource`).
- **Doc:** dropdown com: **Indefinido · Recursos Do Tesouro · Transferências E Convênios
  Estaduais - Vinculados · Recursos Próprios De Fundos Especiais De Despesa - Vinculados ·
  Recursos Próprios Da Administração Indireta · Transferências E Convênios Federais -
  Vinculados · Outras Fontes De Recursos · Operações De Crédito**.
- **Ação:** converter os 3 para `<select>` com essas 8 opções. Strings → **sem backend**.

### FE3 · Tipo de Validação do Lançamento de Despesas *
- **Hoje:** não existe campo top-level; só há "Tipo de validação" **por anexo** (`tipoValidacao1/2`).
- **Doc:** campo **obrigatório**, dropdown: **Sem Validação · Validar Plano de Aplicação**.
- **Ação:** adicionar `<select>` obrigatório mapeado ao DTO **`validationType`** (já existe no
  DTO, hoje o form não envia). → **sem backend**.

## 2. Cronograma de Repasses (aba Contas) — reestruturar

O doc redefine a aba "Inclusão contas a pagar" como **Cronograma de Repasses**:
- **Valor total do contrato** (temos `valorTotal`).
- **Tipo de recebimento:** Único · Recorrente.
- Se **Recorrente:** **Número de repasses** + flag **"Definir valor e data manualmente"**.
- Sistema **gera automaticamente** o cronograma (calculado, ou editável se flag manual ligado).
- **Tabela** (sem "1º/2º/3º", baseada em **competência**):

  | Competência (mês jan–dez) | Data prevista para repasse | Valor previsto |
  |---|---|---|

- **Hoje:** aba com `payables[]` = `{ installment(nº), dueDate, value }` + select "Parcelar".

### FE5 · Frontend
- Trocar "Parcelar" por **Tipo de recebimento** (Único/Recorrente); reintroduzir **Número de
  repasses** + flag manual; **gerar** as linhas do cronograma automaticamente; coluna
  **Competência** (select de mês) em vez de número de parcela.

### BE1 · Backend (bloqueante para persistir competência) 🔴
- `CreatePartnershipPayableDto` é `{ installment(number), dueDate, value }`. O doc exige
  **Competência (mês)** e **não** numeração 1º/2º/3º.
- **Alteração sugerida:** adicionar `competency` (mês: enum `January…December` ou string) ao
  payable — ou substituir `installment` por `competency`. Sem isso, a competência não persiste.

### BE2 · Backend (opcional — persistir a configuração)
- **Tipo de recebimento**, **Número de repasses** e **flag manual** não existem no DTO.
- Se precisar recarregar a configuração na edição, adicionar `receiptType`
  (`Single|Recurring`), `installmentsCount`, `manualSchedule`. **Front-first:** pode ser
  só UI e reconstruir a config a partir da tabela salva.

## 3. Tela de Anexos (arquivos + descrição)

- **Doc:** tela separada onde o usuário **anexa arquivos** ao contrato, cada um com uma
  **descrição** (contrato assinado, CNDs, etc.); ficam consultáveis depois (auditoria).
- **Hoje:** a aba "Anexos" é só um aviso informativo; o que existe é `annexes[]` (metadados:
  `printDate/deadlineDate/validationType`) — **conceito diferente** de arquivo+descrição.
- **Observação:** o `GET /{id}` já retorna um array **`files: []`** (distinto de `annexes`),
  o que confirma que "Anexos = arquivos" é uma entidade à parte.

### BE3 · Backend (bloqueante para anexos com arquivo) 🔴
- Não há endpoint de arquivos para parcerias no Swagger.
- **Alteração sugerida:** espelhar o padrão de Compras:
  - `POST /v1/partnerships/{id}/files` (`fileUrl, fileKey, description`)
  - `GET /v1/partnerships/{id}/files` · `DELETE /v1/partnerships/{id}/files/{fileId}`
- **Frontend (após o endpoint):** aba Anexos com upload (`UploadService` já existe) +
  campo descrição por arquivo + lista/remover.
- **Confirmar:** o bloco atual de `annexes` (2 conjuntos printDate/deadline/validation) é
  mantido, ou substituído por esta tela de arquivos?

## 4. Coluna "Ações" da lista

| Ação | Hoje | Ajuste |
|---|---|---|
| **Editar** (lápis) | ✅ implementado | ok |
| **Visualizar** (olho) — **sem edição** | abre a tela **editável** | **FE4:** abrir em **modo somente leitura** (form desabilitado) |
| **Anexos** | não existe | depende de **BE3**; adicionar ação que abre a tela de anexos |
| **Excluir** (no menu …, restrito) | delete direto | **BE7:** exclusão/inativação **exige autorização de superior** → regra de permissão no backend + gate na UI |
| **Adicionar novo instrumento** (aditamento/apostilamento) | não existe | **BE6:** modelar instrumentos vinculados ao contrato (nova sub-entidade/endpoint) |
| **Integrar com o financeiro** (contas a receber) | não existe | **BE5:** integração com contas a receber (endpoint/fluxo) |
| **Visualizar recebimentos** | não existe | **BE4:** consultar recebimentos do contrato (endpoint) |

## 5. Confirmações de regra
- **Concessor** "deve vir as informações do Órgão": se for **auto-preencher** dados ao
  selecionar o órgão, é frontend (buscar `GET /v1/grantors/{id}`). Confirmar o que exibir.
- **Entidade** "Matriz ou Filiais": confirmar se o lookup de entidades já traz filiais.

---

## Resumo priorizado

**Frontend (sem backend) — dá pra fazer já:**
- FE1 Tipo de Contratualização → select (9 opções)
- FE2 Fonte de Recurso → select (8 opções)
- FE3 Tipo de Validação do Lançamento → select obrigatório (`validationType`)
- FE4 Visualizar → modo somente leitura
- FE5 (parcial) Cronograma: Tipo de recebimento/nº repasses/flag + geração (UI)

**Backend — bloqueia parte do escopo:**
- BE1 🔴 Competência no payable (mês, sem numeração)
- BE3 🔴 Endpoint de arquivos por parceria (anexos com descrição)
- BE2 config do cronograma (opcional)
- BE4 Visualizar recebimentos · BE5 Integrar financeiro · BE6 Novo instrumento
  (aditamentos) · BE7 Exclusão com autorização
