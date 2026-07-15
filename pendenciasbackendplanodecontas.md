# Pendências de Back-end — Módulo Plano de Contas e Categorias

> Auditoria Front × Back × Swagger × PDF do cliente.
> Endpoints: `POST/GET /v1/account-plan`, `GET/PATCH/DELETE /v1/account-plan/{id}`, `GET /v1/account-plan/export/excel`.
> DTO: `CreateAccountPlanDto` / `UpdateAccountPlanDto`.

---

## B-PC-01 🔴 ALTA — `GET /v1/account-plan` sem filtros/paginação e sem schema de resposta
- **Hoje:** `findAll` **não** aceita `status`, `search`, `take/skip`. Retorna tudo; o Front filtra/pagina/ordena **client-side**.
- **Problema:** o doc do cliente pede filtro de Status, busca geral e "Exibir itens" (10..500). Funciona client-side hoje porque a base é pequena, mas não escala e a resposta **não tem schema** documentado.
- **Pedido:** adicionar `status`, `search`, `take`, `skip`; documentar o DTO de resposta (incluindo estrutura de **hierarquia** — ver B-PC-06).

## B-PC-02 🔴 ALTA — Valores canônicos de `categoryType` e `accountType` indefinidos (string livre)
- **Hoje:** ambos são `string` livre no Swagger. Dados já gravados aparecem com valores inconsistentes (ex.: `SINTETICA`, `ANALITICA`, `DESPESA`, `RECEITA`).
- **Decisão do cliente (PDF):**
  - `categoryType` (**Tipo da Categoria**) ∈ **Entrada / Saída / Totalizadora**
  - `accountType` (**Tipo de Conta**) ∈ **Sintética / Analítica**
- **Front já alinhado** a esses valores (Patch 06). **Pedido ao Back:**
  1. Fixar/validar esses valores canônicos no contrato (enum).
  2. **Migrar** os registros existentes com valores antigos para os canônicos (senão o filtro por tipo não casa em dados legados).

## B-PC-03 🟠 MÉDIA — Endpoints de "orçamento em lote" inexistentes
- **Doc pede 3 ações:** "Marcar todas as contas para orçamento", "Marcar para orçamento apenas contas com transação", "Desmarcar todas as contas para orçamento".
- **Hoje:** não há rota; os botões no Front não têm efeito.
- **Pedido:** criar endpoints de atualização em lote do flag `budgetManagement` (ex.: `PATCH /v1/account-plan/budget-flag` com modo `all` | `with_transactions` | `none`).

## B-PC-04 🟠 MÉDIA — Semântica de "Categoria" e dos campos de Provisão/Baixa
- **"Categoria" (obrigatório no doc):** hoje o Front usa um **select de Centro de Custo** (carrega `/v1/projects`, filtra `_entityType='cost_center'`) e envia o ID em `category`. Confirmar se é essa a intenção, ou se "Categoria" é um conceito próprio (texto/enum) distinto de Centro de Custo.
- **Provisão/Baixa** (`creditProvision`, `debitProvision`, `creditWriteOff`, `debitWriteOff`): rotulados "Categoria para...". Hoje são **texto livre**. Confirmar se deveriam **referenciar IDs de outras categorias** do plano de contas (self-reference) — nesse caso o contrato deveria usar `number`/FK em vez de `string`.

## B-PC-05 🟠 MÉDIA — Obrigatoriedade divergente
- **Swagger exige** só `code` e `title`.
- **Cliente exige:** Categoria, Grupo da Categoria, Tipo da Categoria, Código, Título.
- **Front (Patch 07)** passou a exigir: Tipo da Categoria, Categoria (Centro de Custo), Grupo da Categoria, Código, Título.
- **Pedido:** alinhar as validações do Back a essa regra (ou confirmar se alguma deve ser opcional).

## B-PC-06 🟡 MÉDIA — Hierarquia (`parentId` / "Adicionar Conta")
- **Doc:** ação "Adicionar Conta (criar subcategoria quando a conta for titular)" e a listagem tem linhas de contas analíticas (filhas).
- **Pedido:** confirmar se o `findAll` retorna a árvore (`children[]`) ou se o Front deve montar a hierarquia por `parentId`; documentar a resposta.

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-PC-01 (filtros/paginação/schema), B-PC-02 (valores canônicos + migração) |
| 🟠 Média | B-PC-03 (orçamento em lote), B-PC-04 (Categoria/Provisão-Baixa), B-PC-05 (obrigatoriedade) |
| 🟡 Média | B-PC-06 (hierarquia) |

### Acoplamento relevante
- Plano de Contas (novo/edição) **consome** `GET /v1/projects` (Centro de Custo).
- Plano de Contas é **fonte** de `accountPlanId` para Produtos/Serviços, Compras, Orçamentos, Contas a Pagar (rateios), Projetos, Impostos — cuidado ao mudar contrato/valores.
