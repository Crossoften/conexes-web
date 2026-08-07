# Demandas de Back-end — Atualizado (pós-Swagger 07/08/2026)

> Cruzamento do **"Consolidado de Pontos de Ajuste" (04/08/2026)** × patches de front entregues (110–131)
> × Swagger atualizado. Este documento é para o **time de back-end**: separa o que **já foi entregue**
> (só validar) do que **ainda depende do servidor**.
> Base do front: **`8941b688`** + patches 110–131. API base: `https://homolog.crosoften.com:8045`.
> Legenda: ✅ **entregue no Swagger** (validar) · ⚠️ **parcial / a confirmar** · ❌ **pendente** · 🚨 **bloqueador**.

---

## A. Já entregue pelo back (só validar em homologação)

Estes destravaram front nesta rodada e já têm patch correspondente aplicado:

| # | Demanda | Endpoint / DTO | Front que passou a usar |
|---|---|---|---|
| BK-1 | Catálogo de **cargos** | `GET/POST/PATCH/DELETE /v1/positions` (`{id,name,description}`) | patch-112/113 (Colaboradores) |
| BK-3 | **Permissões efetivas** do usuário | `effectivePermissions` + `permissionProfile` em `UserDetailDto`/`ResponseAllUserDto` | patch-110 (detalhe do usuário) |
| BK-7 | **DELETE** de usuário e perfil | `DELETE /v1/users/{id}` · `DELETE /v1/permission-profiles/{id}` | já ligado no front (sem patch) |
| BK-9 | **Histórico da Entidade** | `GET /v1/institutional/entities/{id}/history` | patch-114/114b (modal timeline) |
| BK-12 | **`parentId`** em Plano de Contas | `parentId` em `Create/UpdateAccountPlanDto` | patch-106 (conta superior) |
| BK-16 | **Consulta CNPJ (Receita)** | `GET /v1/institutional/entities/cnpj/{cnpj}` → `CnpjLookupResponseDto` | patch-115 (cadastro de entidade) |
| BK-18 | **Exportações** | `bank` + `bank-accounts` `/export/excel` | patch-116 (Banco/Conta) |
| BK-C2 | **Ator das ações via JWT** | action DTOs sem `userId` (Restart/Cancel/Reject/RequestChanges/MoveStage/ChangeBuyer/SetApprovers) | patch-111 (removeu `userId`) |

> **Pontos de validação (não são pendências, mas confirmar):**
> - **BK-1:** o catálogo `/v1/positions` precisa estar **populado** (senão o select de cargo vem vazio — comportamento correto, sem ids falsos).
> - **BK-9:** confirmar o **shape** do histórico. O front normaliza de forma tolerante (`user` objeto `{id,name}`, `createdAt`, `changes[{field,from,to}]`). Se divergir, avisar.
> - **BK-18:** confirmar os **paths** exatos (`/institutional/bank-accounts/export/excel` e `/institutional/banks/export/excel`).

---

## B. Pendências reais do back (a fazer)

### B0 — Bloqueadores / alta prioridade

| # | Demanda | Status | Detalhe para o back |
|---|---|---|---|
| **BK-2** | Persistir `permissions` no perfil | ⚠️ DTO tipado; **persistência a confirmar** | `UpdatePermissionProfileDto` já aceita `permissions[]`. Confirmar que o **PATCH grava de fato** o array (o front foi blindado contra corrida em patch-120/121 e envia o array correto). |
| **BK-4** | Causa do **500** em `POST /v1/purchases/requests` | ❌ runtime | Requisição falha com erro interno mesmo com campos válidos. Informar a **causa real** (item de serviço sem `serviceId`? campo rejeitado? validação?). O front já sanitiza o payload (auto-preenche item, converte monetário, envia flags de fornecedor). |
| **BK-C1** | Isentar **Gestor** da alçada por valor no approve | ❌ runtime | Gestor/Master/Admin recebem **403** ao aprovar via fallback por faixa de valor. Isentar Gestor da checagem de faixa. |

### B1 — Essenciais

| # | Demanda | Status | Detalhe |
|---|---|---|---|
| **BK-5** | Contrato de **fornecedores/cotações** na requisição | ⚠️ campos entregues; **fluxo a validar** | `CreatePurchaseRequestDto` ganhou `uniqueSupplier/exclusiveSupplier/withoutSubsidy/supplierCount` (front já envia — patch-119). Validar ponta a ponta o registro das **3 cotações** e como se ligam à requisição (`purchase-quotations.modal` já consome o contrato). |
| **BK-6** | Lookups de Compras expõem mais campos | ⚠️ parcial | `UserDetailDto` tem `area` ✅. **Confirmar** que `GET /v1/products-services` expõe `group`, `measure`, `costBase` no list/`{id}` — o front já lê tolerante (patch-118) e auto-preenche o item. |
| **BK-8** | Endpoint de **Fonte Pagadora** | ❌ pendente | "Fonte Pagadora" da requisição segue **texto livre** (`payingSource` string). Definir a origem e expor listagem para virar select. |
| **BK-10** | Validação server-side do **Código do CC** | ❓ a confirmar | Código de CC (hierarquia 1, 1.1…) só números/pontos. Front já valida (patch-107); validar também no back. |
| **BK-11** | **Sintético/Analítico** + bloqueio de lançamento | ❌ pendente | Classificar CC/Projeto/Categoria como Sintético (sem lançamento) ou Analítico, com bloqueio no back. |
| **BK-C3** | Impostos do fornecedor **duplicados** | ❌ modelagem | Dado fiscal vive em `stakeholder.taxesAndServices` **e** `/v1/tax-service`. Unificar/sincronizar. |

### B2 — Desejáveis / melhorias

| # | Demanda | Status | Detalhe |
|---|---|---|---|
| **BK-13** | Cadastros de **Grupos de Produtos / Fabricantes / Unidades de Medida** | ❌ | Hoje `group`/`manufacturer`/`measure` são texto livre. |
| **BK-14** | Catálogo de **códigos de imposto** (IRRF, PCC, INSS, PIS, COFINS, CSLL, ISS) | ❌ | Hoje digitados a cada cadastro. |
| **BK-15** | **Importações em massa** via planilha | ⚠️ parcial | `stakeholders /import` existe; faltam Plano de Contas, Produtos, Itens de requisição. |
| **BK-17** | Flag **"Tipo de Recurso" (Público/Privado)** no banco | ⚠️ | `resourceType` aparece no DTO de bank-account — confirmar semântica Público/Privado. |
| **BK-19** | **Matriz × filiais** (Entidade) | ❌ / ❓ decisão | Depende de decisão de produto + hierarquia/endpoint. |
| **BK-20** | **Reaproveitar serviços/alíquotas** entre fornecedores | ⚠️ | `tax-service/operation-nature` com busca (parcial); definir fonte compartilhada. |

---

## C. Resumo priorizado (para o time)

| Prioridade | Itens |
|---|---|
| **P0 (bloqueia teste do cliente)** | BK-2 (persistência real do perfil), BK-4 (500 na requisição), BK-C1 (403 do Gestor) |
| **P1** | BK-5 (validar cotações), BK-6 (`group/measure/costBase`), BK-8 (Fonte Pagadora), BK-10, BK-11, BK-C3 |
| **P2** | BK-13, BK-14, BK-15, BK-17, BK-19, BK-20 |
| **✅ Validar (já entregue)** | BK-1, BK-3, BK-7, BK-9, BK-12, BK-16, BK-18, BK-C2 |

> O front já está pronto para **todos** os itens da coluna "✅ Validar" e para os campos de BK-2/BK-5/BK-6.
> Assim que P0 estiver confirmado em homologação, o roteiro de testes do cliente (arquivo
> `roteiro-testes-cliente.md`) pode ser executado de ponta a ponta.
