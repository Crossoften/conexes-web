# Auditoria Funcional — Módulo de Compras

> Confronto entre a **implementação atual do frontend**, o **Swagger oficial**
> (`https://homolog.crosoften.com:8045`, tag _Admin - Compras e Requisições_) e as
> **regras de negócio** da documentação de auditoria. Prioriza correções no frontend;
> itens de backend estão isolados no Relatório 3.
>
> **Escopo de código:** `features/purchases`, `features/quotations`,
> `features/purchasing-management`, `features/purchasing-dashboard`,
> `features/purchasing-registries`, `features/approval-tiers`, `core/auth`.

---

## Achado estrutural (após confronto com o Swagger)

O backend **já expõe todo o fluxo de 6 etapas**. O gargalo é **frontend**: parte dos
endpoints está no `purchases.service.ts` mas **sem tela**, e parte **nem foi adicionada
ao service**. Praticamente nada do que falta é limitação de API.

### Endpoints do Swagger `/v1/purchases/*` × estado no frontend

| Endpoint (Swagger) | Regra | No `service`? | Na UI? |
|---|---|:--:|:--:|
| `POST /requests` · `PATCH /requests/{id}` · `GET /requests/{id}` | Etapa 1 (criar/editar/ver) | ✅ | ✅ |
| `GET /requests` · `/requests/stage/{n}` · `/requests/history` | Listagens | ✅ | ✅ |
| `POST /requests/{id}/submit` | Enviar p/ aprovação (1→2) | ✅ | ❌ |
| `POST /requests/{id}/approve` | Aprovar (cadeia + e-mail) | ✅ | ✅ (lista) |
| `POST /requests/{id}/reject` | Reprovar | ✅ | ✅ |
| `POST /requests/{id}/request-changes` | **Solicitar ajustes** | ❌ | ❌ |
| `POST /requests/{id}/cancel` · `/restart` · `/move` | Ações do Gestor | ✅ | ✅ (sem gate) |
| `PATCH /requests/{id}/buyer` · `/approvers` | Alterar comprador/aprovadores | ✅ | ✅ (sem gate/faixa) |
| `POST /requests/{id}/export-to-quotation` | Seguir p/ cotação sem aprovação | ✅ | ❌ |
| `POST /requests/{id}/award` (`by_supplier`/`by_item`) | **Etapa 4: adjudicar → gera Pedido(s)** | ❌ | ❌ |
| `POST /requests/{id}/complete` | Concluir (5→6) | ✅ | ❌ |
| `GET /requests/{id}/history` | Histórico estruturado | ✅ | ❌ |
| `POST\|GET\|DELETE /requests/{id}/files` | Anexos | ✅ | ❌ |
| `GET /requests/{id}/pdf` | **Exportar PDF** | ❌ | ❌ |
| `GET /requests/{id}/excel` | Exportar Excel | ✅ | ✅ (parcial) |
| `POST /quotations` · `GET /quotations/request/{id}` | Etapa 3 (cotações) | ✅ | ❌ |
| `PATCH /quotations/{id}/approve` · `/reject` | Aprovar/reprovar cotação | ✅ | ❌ |
| `GET /orders` · `GET /orders/{id}` | **Pedidos (Etapas 5/6)** | ❌ | ❌ |
| `GET /dashboard` | Dashboard | ✅ | ✅ |
| `…/contracts*` | Contratos | ✅ | ❌ |

**Métodos que faltam até no `service`** (o Swagger tem, o FE não): `request-changes`,
`award`, `orders` (lista/detalhe), `pdf`.

---

## 1. Regras implementadas corretamente

| # | Regra | Evidência |
|---|---|---|
| C1 | **Fornecedores só consumidos** (Stakeholders), sem recadastro. | `purchasing-registries.service.ts:84-89`; `-list.page.ts:27-32` |
| C2 | **Locais de entrega** com CRUD em `/v1/delivery-locations` e seleção na requisição. | `purchasing-registries.service.ts:66-82`; `quotation-new.page.html:191-196` |
| C3 | **Alçadas não duplicadas** — vivem em `approval-tiers` (`/v1/approval-limits`). | `approval-tiers.service.ts:26-52` |
| C4 | **Service único** compartilhado entre gerenciamento, cotações e dashboard. | `PurchasesService` em `purchasing-management.store.ts:4`, `quotations.store.ts:4`, `purchasing-dashboard.page.ts:5` |
| C5 | **Modais** de detalhe e ação reutilizados pelas duas listas. | `purchasing-management-list.page.ts:8-9`, `quotations-list.page.ts:9-10` |
| C6 | **Status unificado** — `ReqStatus` alias de `PurchaseRequestStatus`. | `purchasing-management.model.ts:23-26` |
| C7 | **Ações administrativas** ligadas aos endpoints corretos (cancel/restart/move/buyer/approvers). | `purchasing-management.store.ts:147-154` → `purchases.service.ts:101-118` |
| C8 | **Gerenciamento** carrega de `/v1/purchases/requests` com paginação server-side. | `purchasing-management.store.ts:177` → `purchases.service.ts:41-53` |
| C9 | **Dashboard** consome `getDashboard` e adere ao shape. | `purchasing-dashboard.page.ts:57,84-131` → `purchases.service.ts:242-244` |
| C10 | **Criação** captura requisitante, título, datas, descrição, justificativa, projeto, itens (nome/qtd/unidade) e valor. | `quotation-new.page.ts:44-64,75-86` |
| C11 | **Lookups compartilhados** reutilizados (projetos, planos, produtos-serviços, locais, usuários, contratos). | `quotation-new.page.ts:88-98` → `purchases.service.ts:126-158` |
| C12 | **Aprovar** já resolve a cadeia sequencial de níveis + e-mail no backend (o FE só dispara). | Swagger `POST /requests/{id}/approve`; `quotations.store.ts:236` |
| C13 | **`/approvers`** valida no backend que cada usuário tem alçada compatível. | Swagger `PATCH /requests/{id}/approvers` |

---

## 2. Ajustes de Frontend

> Formato: **Regra → Problema → Correção → Impacto.** `FE-1` habilita os gates.

### FE-1 — Ler o papel do usuário (`purchaseRoles` + role global)
- **Regra:** permissões respeitam Alçadas + role global.
- **Problema:** `AuthService.MySelfResponse` **descarta** o campo `purchaseRoles`, que o
  Swagger já retorna em `/my-self` (`ResponseAllUserDto.purchaseRoles`, derivado das
  alçadas). Não há helpers de permissão (`auth.service.ts:21-31`).
- **Correção:** incluir `purchaseRoles: PurchaseRole[]` no `MySelfResponse`/`AuthUser` e
  criar um `PurchasePermissionsService` com `isManager()`, `hasPurchaseRole(role)`.
  Gestor = papel `Manager` **ou** role global em `Master/Admin/ProcurementManager`. Para
  faixa/nível (FE-4), complementar com `GET /v1/approval-limits?userId=<me>`.
- **Impacto:** habilitador de FE-2/FE-3/FE-4. Alto.

### FE-2 — Gate de Gestor no Gerenciamento
- **Regra:** cancelar/reiniciar/mover/alterar aprovadores/comprador são só do **Gestor**.
- **Problema:** menu ⋯ e **Cancelar** renderizados sem checagem
  (`purchasing-management-list.page.html:105-117`).
- **Correção:** `@if (perms.isManager())` sobre o menu ⋯ e o Cancelar.
- **Impacto:** alto.

### FE-3 — Gate de perfil nas ações por etapa
- **Regra:** cada etapa libera ações ao papel correspondente (Etapa 2 =
  `RequestSupervisor`; Etapa 4 = `PurchaseSupervisor`).
- **Problema:** `canApprove/canReject/…` dependem só de `routeStage`
  (`quotations-list.page.ts:32-38`) — Requisitante vê **Aprovar** na Etapa 2.
- **Correção:** compor cada flag com o papel (FE-1).
- **Impacto:** alto (bug relatado; vale para todos os perfis).

### FE-4 — "Alterar aprovadores" deve listar por alçada/nível/faixa
- **Regra:** cada nível lista **apenas** `RequestSupervisor` do nível/faixa compatível ao
  valor.
- **Problema:** selects vêm de `getUsersLookup` (todos os usuários,
  `purchasing-management.store.ts:126-127`); sem filtro de nível/faixa.
- **Correção:** carregar `/v1/approval-limits`, filtrar `RequestSupervisor`, agrupar por
  `level` e restringir por `minValue/maxValue` vs. `estimatedValue`. (O backend já
  valida — isto é UX/consistência.)
- **Impacto:** alto.

### FE-5 — "Enviar para aprovação" e caminho alternativo
- **Regra:** concluída a Etapa 1, enviar p/ aprovação; se não houver aprovação
  configurada, seguir direto p/ cotação.
- **Problema:** `submitRequest` existe no service e **nenhuma tela o chama**;
  `exportRequestToQuotation` idem.
- **Correção:** ação **Enviar para aprovação** na Etapa 1 (`submitRequest`); usar o
  `approvalFlow` do detalhe (`GET /requests/{id}` "inclui approvalFlow") para decidir o
  caminho alternativo (`exportRequestToQuotation`).
- **Impacto:** alto.

### FE-6 — "Solicitar ajustes" (estado `AwaitingAdjustment`)
- **Regra:** aprovadores podem aprovar, reprovar **ou solicitar ajustes** (volta ao
  requisitante como "Aguardando ajustes", editável e reenviável).
- **Problema:** não há endpoint no service nem ação no modal; o enum
  `PurchaseRequestStatus` **não tem** `AwaitingAdjustment` (`purchases.model.ts:13-21`),
  embora o Swagger liste; `PurchaseActionKind` não tem `request-changes`
  (`purchases.model.ts:318`).
- **Correção:** adicionar `AwaitingAdjustment` ao enum + config de badge; adicionar
  `requestChanges()` no service (`POST /requests/{id}/request-changes`); nova ação
  "Solicitar ajustes" no modal (com justificativa).
- **Impacto:** alto.

### FE-7 — Etapa 3 (Cotações) sem UI
- **Regra:** inserir 1+ cotações, cada uma vinculada a um fornecedor (Stakeholders).
- **Problema:** `createQuotation`/`getQuotationsByRequest` existem no service, sem tela.
- **Correção:** tela de cotações (adicionar cotação escolhendo fornecedor via lookup de
  Stakeholders) + "Enviar para análise".
- **Impacto:** alto.

### FE-8 — Etapa 4 (Análise/Adjudicação) sem UI e sem service
- **Regra:** aprovar **por fornecedor** (1 pedido) ou **por item** (N pedidos).
- **Problema:** o endpoint `POST /requests/{id}/award` (`AwardDto` `by_supplier`/`by_item`
  + `selections[]`) **não existe no service** nem na UI. Só há
  `approveQuotation`/`rejectQuotation` (fluxo parcial).
- **Correção:** adicionar `award()` ao service e a tela de análise (alternador por
  fornecedor/por item → `Gerar pedidos`).
- **Impacto:** alto (núcleo do fluxo).

### FE-9 — Etapa 5/6 (Pedidos) sem UI e sem service
- **Regra:** listar pedidos gerados, acompanhar e **Concluir**.
- **Problema:** `GET /purchases/orders` e `/orders/{id}` **não existem no service**;
  `completeRequest` existe mas não é chamado.
- **Correção:** adicionar `getOrders()`/`getOrderById()`; tela de Pedidos (Etapa 5) com
  ação **Concluir** (`completeRequest`). Integração financeira já é consultável via
  `GET /v1/accounts-payable?purchaseRequestId=` (existe).
- **Impacto:** alto.

### FE-10 — Anexos apenas placeholder
- **Regra:** anexar (upload), listar e remover na edição.
- **Problema:** aba Anexos é placeholder (`quotation-new.page.html:203-207`); endpoints
  `files` nunca chamados.
- **Correção:** upload com `shared/services/upload.service.ts` (`uploadOneFile` → retorna
  `{fileUrl,fileKey}`) + `attach/list/remove` (`AttachFileDto` espera `fileUrl`+`fileKey`).
- **Impacto:** alto.

### FE-11 — Histórico ausente no modal
- **Regra:** rastreabilidade com usuário, data/hora, ação, etapa, alterações.
- **Problema:** modal só tem `DADOS/FONTE/ITENS/LOCAL`
  (`purchase-request-detail.modal.ts:5`); `getRequestActionHistory` nunca consumido.
- **Correção:** aba **Histórico** consumindo `GET /requests/{id}/history`
  (`PurchaseRequestHistoryItemDto`: `action`, `stage`, `user`, `createdAt`, `changes`,
  `reason`). Renderizar `changes` de forma legível (ver BE-1 quanto ao formato).
- **Impacto:** alto.

### FE-12 — Exportar PDF não existe
- **Regra:** exportar a requisição em PDF.
- **Problema:** `GET /requests/{id}/pdf` existe no Swagger, mas **não há método no
  service** nem botão.
- **Correção:** adicionar `generateRequestPdf()` (blob) e botão de exportar PDF (análogo
  ao Excel em `quotations.store.ts:244`).
- **Impacto:** médio.

### FE-13 — Centro de custo não é campo próprio
- **Regra:** requisição tem Projeto **e** Centro de Custo (campos distintos no
  `CreatePurchaseRequestDto`: `projectId` e `costCenterId`).
- **Problema:** o select "Projeto/Centro de Custos" liga só `projectId`; `costCenterId`
  nunca é enviado (`quotation-new.page.html:78-80`; `buildPayload` `:204-224`).
- **Correção:** select separado de Centro de Custo via `GET /v1/cost-centers` (lookup
  dedicado existe) e enviar `costCenterId`.
- **Impacto:** médio.

### FE-14 — Controles inertes
- **Problema:** 3 botões **Exportar** sem `(click)`
  (`purchasing-management-list.page.html:39`, `purchasing-registries-list.page.html:53`,
  `quotations-list.page.html:59`) e select "Selecione o tipo" sem binding
  (`purchasing-registries-list.page.html:49`).
- **Correção:** ligar ao export existente ou remover; ligar o select ao filtro.
- **Impacto:** baixo/médio.

### FE-15 — Validação/máscara inconsistentes na criação
- **Problema:** criação sem `[class.is-invalid]` por campo (diferente de
  `delivery-location-new.page.html:26`); valores como `type=number` cru, sem `formatBRL`.
- **Correção:** padronizar destaque de inválido e máscara BRL.
- **Impacto:** baixo.

---

## 3. Ajustes necessários no Backend

> Após o confronto com o Swagger, **quase todas as regras já são atendidas pela API**.
> Resta essencialmente um ponto a confirmar.

### BE-1 — Formato do campo `changes` no histórico _(a confirmar)_
- **Endpoint:** `GET /v1/purchases/requests/{id}/history` →
  `PurchaseRequestHistoryItemDto.changes` (tipado como `object` genérico).
- **Limitação:** se `changes` traz o **snapshot completo** em vez do diff campo-a-campo
  (`{ campo, valorAnterior, valorNovo }`), o frontend não consegue montar o "rótulo →
  valor" pedido de forma confiável.
- **Alteração necessária:** garantir que `changes` seja o diff estruturado por campo.
- **Justificativa:** exigência de rastreabilidade legível. _(Validar a resposta real
  antes de abrir a demanda — pode já vir estruturado.)_

> **Itens antes suspeitos de backend, agora confirmados como existentes na API**
> (viraram FE): PDF (`/pdf`), adjudicação por item/fornecedor (`/award`), Pedidos
> (`/orders`), "Solicitar ajustes" (`/request-changes`), cadeia de aprovação + e-mail
> (`/approve`), descoberta da configuração de aprovação (`approvalFlow` no detalhe),
> integração financeira (`/accounts-payable?purchaseRequestId=`).

---

## 4. Melhorias Técnicas

- **MT-1 — Duplicação de store.** `PurchasingManagementStore` e `QuotationsStore` têm
  `openDetail/openAction/submitAction/users/copy` quase idênticos (o `switch` de
  `submitAction` é copiado — `purchasing-management.store.ts:147-154` ≡
  `quotations.store.ts:217-224`). Extrair base comum.
- **MT-2 — Dois mapas de cor de status.** `PURCHASE_REQUEST_STATUS_CONFIG`
  (`purchases.model.ts:34-43`) x `REQUISITION_STATUS_COLORS`
  (`purchasing-dashboard.model.ts:41-50`). Unificar.
- **MT-3 — Centralizar permissões** no `PurchasePermissionsService` (FE-1).
- **MT-4 — Sincronizar o model com o Swagger.** Enum de status sem `AwaitingAdjustment`;
  `PurchaseActionKind` sem `request-changes`; faltam tipos de `AwardDto`/Order. Manter o
  model como espelho fiel do Swagger.
- **MT-5 — Cache de lookups** (usuários/projetos/etc. refeitos por store).
- **MT-6 — Padronizar validação/máscara** entre os formulários (ver FE-15).

---

## Prioridade sugerida

1. **FE-1 → FE-2/FE-3/FE-4** (permissão + gates: resolvem o problema relatado, valem p/
   todos os perfis).
2. **FE-5, FE-6, FE-9(Concluir), FE-11, FE-12** (transições/telas que só faltam ligar a
   endpoints existentes — baixo custo, alto ganho).
3. **FE-7, FE-8, FE-9(Pedidos)** (cotações, adjudicação e pedidos — exigem novos métodos
   no service, mas a API está pronta).
4. **FE-10, FE-13, FE-14, FE-15** e **MT-1…MT-6**.
5. **BE-1**: validar o formato real de `changes` antes de abrir demanda de backend.
