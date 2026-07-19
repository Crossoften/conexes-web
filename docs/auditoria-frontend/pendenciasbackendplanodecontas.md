# Pendências de Back-end — Plano de Contas e Categorias

> `POST/GET /v1/account-plan`, `GET/PATCH/DELETE /{id}`, `GET /export/excel`, `PATCH /budget-flag`.
> Base: `https://homolog.crosoften.com:8045` — tag *Admin - Plano de Contas*.
> Front: Angular 20 (`src/app/features/chart-of-accounts`).
> Legenda: 🔴 Alta · 🟠 Média · 🟡 Baixa · ✅ **RESOLVIDO pelo back**.

---

## 🔴 Abertas / a corrigir no back

### B-PC-03 · `PATCH /v1/account-plan/budget-flag` existe mas **NÃO persiste** (CONFIRMADO EM PRODUÇÃO)
- **Onde:** `PATCH /v1/account-plan/budget-flag` · `SetBudgetFlagDto { mode: 'all' | 'with_transactions' | 'none' }`.
- **Sintoma ao vivo:** o Front ligou os botões de orçamento em lote; ao clicar e confirmar, a chamada é feita mas **nada muda** (o `budgetManagement` das contas não é atualizado) e **não há erro visível** — o endpoint existe no contrato mas **não aplica** a marcação no banco.
- **Pedido ao Back:**
  1. Implementar/corrigir a **persistência** do `budget-flag`: `all` marca todas; `none` desmarca todas; `with_transactions` marca só as que têm transação.
  2. Retornar algo verificável (ex.: nº de contas afetadas) e erro tratado em caso de falha.
- **Estado no Front:** os botões de orçamento em lote (e o "Expandir todas") foram **ocultados** (patches 76/77) até o endpoint funcionar. Os métodos `svc.setBudgetFlag()` / `store.setBudgetFlag()` ficaram prontos e inertes — reativar é só recolocar os botões.
- **Obs.:** o modo **`with_transactions`** também depende de **definição de regra com o cliente** (o que conta como "com transação").

### B-PC-04 · Semântica de "Categoria" e Provisão/Baixa
- **Onde:** `CreateAccountPlanDto` — `category` ("Categoria (Centro de Custo)"), `creditProvision/debitProvision/creditWriteOff/debitWriteOff`.
- **Dúvida:** "Categoria" = Centro de Custo (FK a `/v1/projects?type=centro_de_custo`) ou texto livre? Provisão/Baixa são texto livre ou FK a contas do próprio plano?
- **Estado no Front:** hoje tratados como **texto livre**; a criação já carrega os centros de custo (`/v1/projects`) para o campo "Categoria". Confirmar a fonte da verdade para tipar corretamente (select × input).

---

## 🟡 Notas

### B-PC-05 · Obrigatoriedade — alinhado
- **Contrato atual:** `CreateAccountPlanDto.required = [code, title, category, categoryGroup, categoryType]`.
- **Front:** já marca `Código`, `Título`, `Categoria`, `Grupo` e `Tipo` como obrigatórios. **Alinhado.**

---

## ✅ Resolvidas pelo Back (Front já consome)

| Item | O que era | Como está agora | Front |
|---|---|---|---|
| **B-PC-01** | `findAll` sem filtros/paginação e sem schema | `GET /v1/account-plan` aceita `status`, `search`, `take`, `skip`; resposta tipada **`ResponseFindAllAccountPlanDto = { data, count, pages }`** com `AccountPlanListItemDto` (incl. `children[]`) | **FE-PC-2** (patch-74) — `getAll()` passou a ler `data` do envelope (a lista quebrava lendo um array); filtro/paginação/árvore client-side mantidos |
| **B-PC-02** | `categoryType`/`accountType` sem valores canônicos | Canônicos **sem acento**: `categoryType` = `Entrada \| Saida \| Totalizadora`; `accountType` = `Sintetica \| Analitica` | **FE-PC-1** (patch-74) — `<option value>` e types alinhados ao canônico; rótulos acentuados via `ACCOUNT_TYPE_LABELS`/`CATEGORY_TYPE_LABELS` (cobrem canônico + legado) |
| **B-PC-06** | Hierarquia (`parentId` / "Adicionar Conta") — confirmar `children[]` | `AccountPlanListItemDto.children[]` (`AccountPlanChildDto`) | Front renderiza a **árvore** (expand/collapse por linha) a partir de `children[]` |

---

### Resumo de prioridade (aberto)
| Prioridade | Itens |
|---|---|
| 🔴 Alta | **B-PC-03 (budget-flag não persiste)**, B-PC-04 (semântica Categoria/Provisão-Baixa) |
| 🟡 Nota | B-PC-05 (obrigatoriedade — alinhado) |

---

### Changelog
- **v2** — B-PC-01/02/06 marcados ✅ **resolvidos pelo back** (Front alinhado nos patches 74/75). **B-PC-03** rebaixado de "endpoint faltante" para "**endpoint existe mas não persiste**" (evidência ao vivo) — botões ocultados no Front (76/77). B-PC-05 alinhado.
- **v1** — versão inicial (B-PC-01 a B-PC-06).
