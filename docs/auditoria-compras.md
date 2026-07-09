# Auditoria Funcional — Módulo de Compras

> Confronto entre a **implementação atual do frontend**, os **endpoints expostos pelo
> `PurchasesService`** (espelho do Swagger `/v1/purchases`) e as **regras de negócio**
> da documentação oficial de auditoria. Prioriza correções no frontend; itens de
> backend estão isolados no Relatório 3.
>
> **Escopo de código:** `features/purchases`, `features/quotations`,
> `features/purchasing-management`, `features/purchasing-dashboard`,
> `features/purchasing-registries`, `features/approval-tiers`, `core/auth`.
>
> **Observação de método:** não há Swagger versionado no repositório (API em
> `homolog.crosoften.com:8045`). Os endpoints foram inferidos do
> `purchases.service.ts`; itens marcados _(confirmar no Swagger)_ dependem de
> validação contra a API real.

---

## Achado estrutural

A **camada de dados está muito mais completa que a camada de tela**. Vários endpoints
existem no `purchases.service.ts` e **nenhuma tela os consome** — o fluxo de 6 etapas
está pela metade na UI:

| Endpoint (existe no service) | Etapa/uso | Consumido na UI? |
|---|---|---|
| `submitRequest` `POST /requests/{id}/submit` | Etapa 1→2 (Enviar p/ aprovação) | ❌ nunca chamado |
| `exportRequestToQuotation` `POST /requests/{id}/export-to-quotation` | Etapa 1→3 (sem aprovação) | ❌ nunca chamado |
| `getQuotationsByRequest` `GET /quotations/request/{id}` | Etapa 3 (cotações) | ❌ nunca chamado |
| `createQuotation` `POST /quotations` | Etapa 3 | ❌ nunca chamado |
| `approveQuotation` / `rejectQuotation` `PATCH /quotations/{id}/(approve\|reject)` | Etapa 4 (análise) | ❌ nunca chamado |
| `completeRequest` `POST /requests/{id}/complete` | Etapa 5→6 (Concluir) | ❌ nunca chamado |
| `getRequestActionHistory` `GET /requests/{id}/history` | Histórico | ❌ nunca chamado |
| `attachRequestFile` / `listRequestFiles` / `removeRequestFile` `…/files` | Anexos | ❌ nunca chamado |

Consumidos hoje: listagem (`getRequests`, `getRequestsByStage`, `getRequestHistory`),
detalhe (`getRequestById`), CRUD da requisição, ações administrativas
(`cancel/restart/move/buyer/approvers`), `approveRequest`, `copyRequest`,
`generateRequestExcel`, lookups e `getDashboard`.

---

## 1. Regras implementadas corretamente

| # | Regra | Evidência |
|---|---|---|
| C1 | **Fornecedores não são recadastrados** — o módulo só consome o Stakeholders (listagem read-only). | `purchasing-registries.service.ts:84-89` (`listSuppliers` via `/v1/stakeholders`, sem create/update/delete); `purchasing-registries-list.page.ts:27-32` (SUPPLIERS sem rota de "Novo") |
| C2 | **Locais de entrega** com CRUD próprio em `/v1/delivery-locations` e seleção do local cadastrado na requisição. | `purchasing-registries.service.ts:66-82`; seleção em `quotation-new.page.html:191-196` (`deliveryLocationId`) |
| C3 | **Alçadas não são duplicadas** — vivem na feature `approval-tiers` (`/v1/approval-limits`), o módulo de Compras não recria a lógica. | `approval-tiers.service.ts:26-52` |
| C4 | **Service único compartilhado** entre gerenciamento, cotações e dashboard. | `PurchasesService` usado em `purchasing-management.store.ts:4`, `quotations.store.ts:4`, `purchasing-dashboard.page.ts:5` |
| C5 | **Modais de detalhe e de ação reutilizados** pelas duas listas (sem duplicar componente). | `purchasing-management-list.page.ts:8-9`, `quotations-list.page.ts:9-10` |
| C6 | **Model de status unificado** — `ReqStatus` é alias de `PurchaseRequestStatus`; sem enum divergente. | `purchasing-management.model.ts:23-26` re-exporta `purchases.model.ts:34-43` |
| C7 | **Ações administrativas** ligadas aos endpoints corretos. | `submitAction` → `cancel/restart/move/buyer/approvers` (`purchasing-management.store.ts:147-154` → `purchases.service.ts:101-118`) |
| C8 | **Gerenciamento** carrega de `/v1/purchases/requests` com paginação server-side. | `purchasing-management.store.ts:177` → `purchases.service.ts:41-53` |
| C9 | **Dashboard** consome `getDashboard` e adere ao shape `PurchaseDashboardResponse` (contadores, distribuição, recentes, pendentes). | `purchasing-dashboard.page.ts:57,84-131` → `purchases.service.ts:242-244`; shape `purchases.model.ts:331-368` |
| C10 | **Criação da requisição** captura requisitante, título, datas, descrição, justificativa, projeto, itens (nome/qtd/unidade) e valor estimado. | `quotation-new.page.ts:44-64,75-86`; payload `:190-225` |
| C11 | **Lookups compartilhados** reutilizados (projetos, planos, produtos-serviços, locais, usuários, contratos) — sem listas hardcoded. | `quotation-new.page.ts:88-98` → `purchases.service.ts:126-158` |
| C12 | **Estados básicos** na criação: obrigatórios, loading no submit, mensagem de erro da API. | `quotation-new.page.ts:45-53,164-188`; HTML `:11-13,216-219` |

---

## 2. Ajustes de Frontend

> Formato: **Regra → Problema → Correção sugerida → Impacto.**
> Ordenados por dependência e severidade. `FE-1` é habilitador dos demais gates.

### FE-1 — Camada de permissão (papel do usuário) não existe
- **Regra:** todas as permissões devem respeitar as Alçadas + role global.
- **Problema:** `AuthService` só lê `role` do `/my-self`; a interface `MySelfResponse`
  ignora papéis de compras e não há nenhum helper de permissão
  (`auth.service.ts:21-31`). Nenhuma tela de compras consulta papel/alçada.
- **Correção:** criar um `PurchasePermissionsService` que combine a **role global**
  (`AuthService.user().role`) com as **alçadas do usuário logado**
  (`GET /v1/approval-limits?userId=<me>`, já suportado em
  `approval-tiers.service.ts:29-35`), expondo `isManager()`,
  `hasPurchaseRole(role)` e `canApproveValue(role, valor)` (nível/faixa).
  Gestor = alçada `Manager` **ou** role global em `Master/Admin/ProcurementManager`.
- **Impacto:** habilitador de FE-2, FE-3 e FE-4. Alto.

### FE-2 — Ações do Gerenciamento visíveis para todos (falta gate de Gestor)
- **Regra:** cancelar/reiniciar/mover/alterar aprovadores/alterar comprador são
  exclusivas do **Gestor**.
- **Problema:** o menu ⋯ e o botão **Cancelar** são renderizados sem nenhuma checagem
  de papel (`purchasing-management-list.page.html:105-117`); não há verificação no
  `page.ts` nem no `store.ts`.
- **Correção:** envolver o menu ⋯ e o Cancelar em `@if (perms.isManager())`.
- **Impacto:** alto (permissão indevida exposta na UI).

### FE-3 — Ações por etapa sem gate de perfil
- **Regra:** cada etapa só libera ações ao papel correspondente (Etapa 2 =
  `RequestSupervisor`; Etapa 4 = `PurchaseSupervisor`; etc.).
- **Problema:** os flags `canApprove/canReject/canCancel/…` dependem **apenas da aba**
  (`routeStage`), nunca do papel (`quotations-list.page.ts:32-38`). Um Requisitante na
  Etapa 2 vê **Aprovar/Reprovar**.
- **Correção:** compor cada flag com o papel do usuário (FE-1): p.ex.
  `canApprove = (stage===1 && perms.hasPurchaseRole('RequestSupervisor')) || (stage===3 && perms.hasPurchaseRole('PurchaseSupervisor'))`.
  Opcional: ocultar/atenuar abas de etapa que o usuário não atua (`quotations-shell`).
- **Impacto:** alto (é o bug relatado; vale para todos os perfis).

### FE-4 — "Alterar aprovadores" lista todos os usuários, não as alçadas
- **Regra:** os selects por nível devem listar **apenas** usuários com alçada
  `RequestSupervisor` do **nível/faixa** compatível com o valor da requisição.
- **Problema:** os 4 selects são preenchidos de `getUsersLookup` (todos os usuários,
  `purchasing-management.store.ts:126-127` → `purchases.service.ts:126-128`); o modal
  não filtra por nível/faixa (`purchase-request-action.modal.html:56-64`).
- **Correção:** carregar `/v1/approval-limits` (via `ApprovalTiersService`), filtrar por
  `purchaseRole==='RequestSupervisor'`, agrupar por `level` e restringir por
  `minValue/maxValue` vs. `request.estimatedValue`. Alimentar cada select do nível com a
  lista filtrada.
- **Impacto:** alto (regra central do fluxo de aprovação por alçada).

### FE-5 — "Enviar para aprovação" (Etapa 1→2) não existe na UI
- **Regra:** ao concluir a requisição, enviar para aprovação (ou seguir p/ cotação se
  não houver aprovação configurada).
- **Problema:** `submitRequest` existe (`purchases.service.ts:89-91`) mas **nenhuma tela
  o chama**; a Etapa 1 só tem "Salvar" e ações de lista.
- **Correção:** adicionar ação **Enviar para aprovação** na Etapa 1 (ícone na lista e/ou
  botão pós-salvar) chamando `submitRequest`; tratar o caminho alternativo com
  `exportRequestToQuotation` quando não houver alçada de aprovação.
- **Impacto:** alto (transição de etapa quebrada).

### FE-6 — Cotações (Etapa 3) e Análise (Etapa 4) sem UI
- **Regra:** inserir cotações vinculadas a fornecedor; analisar aprovando **por
  fornecedor** (1 pedido) ou **por item** (N pedidos).
- **Problema:** nenhuma tela consome `createQuotation`, `getQuotationsByRequest`,
  `approveQuotation`/`rejectQuotation`. Não há aba/tela de cotação nem de análise.
- **Correção:** implementar a tela de cotações (adicionar cotação escolhendo fornecedor
  do Stakeholders) e a análise por fornecedor/por item. **Parcial:** a adjudicação
  "por item → N pedidos" e a entidade Pedido dependem de backend (ver BE-3).
- **Impacto:** alto (núcleo do fluxo ausente).

### FE-7 — "Concluir" (Etapa 5→6) não existe na UI
- **Regra:** Etapa 5 conclui e avança para o encerramento.
- **Problema:** `completeRequest` existe (`purchases.service.ts:168-170`) e não é chamado.
- **Correção:** ação **Concluir** na Etapa 5 chamando `completeRequest`.
- **Impacto:** alto.

### FE-8 — Anexos apenas placeholder
- **Regra:** na edição da requisição, anexar (upload), listar e remover arquivos.
- **Problema:** a aba Anexos exibe "será habilitado em breve" e dropzone desabilitada
  (`quotation-new.page.html:203-207`); endpoints `attach/list/remove` nunca chamados.
- **Correção:** implementar upload com `shared/services/upload.service.ts`
  (`uploadOneFile`, já usado em Órgãos) + `attachRequestFile/listRequestFiles/removeRequestFile`.
- **Impacto:** alto.

### FE-9 — Histórico ausente no modal de detalhe
- **Regra:** rastreabilidade com usuário, data, hora, ação, etapa e alterações.
- **Problema:** o modal só tem abas `DADOS/FONTE/ITENS/LOCAL`
  (`purchase-request-detail.modal.ts:5`); `getRequestActionHistory` nunca é consumido.
- **Correção:** adicionar aba **Histórico** consumindo `getRequestActionHistory`,
  exibindo usuário/data-hora/ação/etapa. O diff legível "antes→depois" depende de
  backend (ver BE-1).
- **Impacto:** alto (exigência de auditoria).

### FE-10 — Centro de custo não é campo próprio
- **Regra:** a requisição tem Projeto **e** Centro de Custo.
- **Problema:** o select "Projeto/Centro de Custos" está ligado só a `projectId`;
  `costCenterId` nunca é preenchido nem enviado (`quotation-new.page.html:78-80`;
  `buildPayload` `quotation-new.page.ts:204-224`).
- **Correção:** separar o select de Centro de Custo (fonte já existe:
  `GET /v1/projects?type=centro_de_custo`, `purchasing-registries.service.ts:90-94`) e
  enviar `costCenterId`.
- **Impacto:** médio.

### FE-11 — Controles inertes (Exportar / select de tipo)
- **Regra:** consistência de interface; sem elementos que não fazem nada.
- **Problema:** três botões **Exportar** sem `(click)`
  (`purchasing-management-list.page.html:39`, `purchasing-registries-list.page.html:53`,
  `quotations-list.page.html:59`) e select "Selecione o tipo" sem binding
  (`purchasing-registries-list.page.html:49`).
- **Correção:** ligar os Exportar ao export existente (`generateRequestExcel` /
  `QuotationsStore.exportExcel`) ou remover; ligar o select ao filtro do store.
- **Impacto:** baixo/médio (expectativa do usuário).

### FE-12 — Feedback de validação por campo inconsistente
- **Regra:** consistência visual de validações entre telas.
- **Problema:** a criação da requisição não aplica `[class.is-invalid]` por campo,
  diferente de `delivery-location-new.page.html:26` e
  `purchasing-registries-new.page.html:26`.
- **Correção:** padronizar o destaque de campo inválido na criação da requisição.
- **Impacto:** baixo.

### FE-13 — Valores monetários sem máscara
- **Regra:** consistência e clareza de entrada.
- **Problema:** valor estimado e valores de item são `input type=number` cru, sem
  formatação BRL (`quotation-new.page.html:51`), enquanto o app tem `formatBRL`
  em `shared/utils/format.ts`.
- **Correção:** aplicar máscara/format BRL nos campos de valor.
- **Impacto:** baixo.

---

## 3. Ajustes necessários no Backend

> Apenas itens que **não podem** ser resolvidos no frontend com a API atual.
> Formato: **Endpoint → Limitação → Alteração necessária → Justificativa.**

### BE-1 — Histórico sem diff "antes → depois"
- **Endpoint:** `GET /v1/purchases/requests/{id}/history`.
- **Limitação:** retorna o snapshot completo da requisição, não o diff campo-a-campo das
  alterações.
- **Alteração necessária:** incluir na resposta as alterações como pares
  `{ campo (rótulo), valorAnterior, valorNovo }` por movimentação.
- **Justificativa:** a regra de rastreabilidade exige "alterações realizadas" legíveis;
  sem o diff, o frontend não tem como montar o "rótulo → valor" pedido.

### BE-2 — Exportação em PDF _(confirmar no Swagger)_
- **Endpoint:** inexistente em `/v1/purchases/requests/{id}` (só há Excel via
  `…/{id}/excel`).
- **Limitação:** o checklist prevê **exportar PDF**; hoje só existe geração de Excel.
- **Alteração necessária:** expor `GET /requests/{id}/pdf` (se ainda não existir).
- **Justificativa:** requisito de exportação do documento da requisição.

### BE-3 — Pedidos de Compra e adjudicação por item _(confirmar no Swagger)_
- **Endpoint:** o service só expõe `approveQuotation`/`rejectQuotation` (por cotação);
  não há endpoint de **geração de pedidos** nem entidade **Pedido (Order)**.
- **Limitação:** a Etapa 4 "por item" deve gerar **N pedidos** (um por fornecedor) e a
  Etapa 5 acompanha pedidos — sem endpoints para isso o frontend não consegue implementar.
- **Alteração necessária:** endpoints de adjudicação (por fornecedor / por item) que
  gerem pedidos, e de listagem/gestão de pedidos por requisição.
- **Justificativa:** Etapas 4 e 5 do fluxo dependem da entidade Pedido.

### BE-4 — Descoberta de configuração de aprovação da requisição _(confirmar no Swagger)_
- **Endpoint:** requisição/alçadas.
- **Limitação:** para decidir entre "enviar para aprovação" e "seguir direto para
  cotação" (Etapa 2 é opcional) e para o "envio automático ao próximo nível + e-mail", o
  frontend precisa saber se há alçada de aprovação aplicável ao valor/contexto.
- **Alteração necessária:** expor no detalhe da requisição (ou endpoint dedicado) se há
  aprovação configurada e a cadeia de níveis/próximo aprovador.
- **Justificativa:** regra "seguir diretamente para Cotação quando não existir aprovação
  configurada" e a sequência obrigatória de níveis.

### BE-5 — Etapa 5: integrações _(confirmar no Swagger)_
- **Endpoint:** pedidos.
- **Limitação:** a Etapa 5 prevê integração financeira, envio por e-mail, integração com
  contratos e acompanhamento de entrega — sem endpoints correspondentes no service atual.
- **Alteração necessária:** endpoints para essas integrações do pedido.
- **Justificativa:** requisitos funcionais da Etapa 5.

---

## 4. Melhorias Técnicas

> Sem alterar regras de negócio — apenas qualidade da implementação.

- **MT-1 — Duplicação de store.** `PurchasingManagementStore` e `QuotationsStore` têm
  blocos quase idênticos (`openDetail/openAction/submitAction/users/copy`, com o `switch`
  de `submitAction` copiado linha a linha — `purchasing-management.store.ts:147-154` ≡
  `quotations.store.ts:217-224`). Extrair uma base comum (classe abstrata ou serviço de
  ações de requisição) parametrizada pela fonte de dados.
- **MT-2 — Dois mapas de cor de status paralelos.** `PURCHASE_REQUEST_STATUS_CONFIG`
  (`purchases.model.ts:34-43`) x `REQUISITION_STATUS_COLORS`
  (`purchasing-dashboard.model.ts:41-50`) descrevem os mesmos 8 status. Unificar em uma
  única fonte de verdade.
- **MT-3 — Centralizar permissões.** O `PurchasePermissionsService` (FE-1) deve ser o
  único ponto de decisão de papel/alçada, evitando checagens espalhadas nas telas.
- **MT-4 — View-models próximos.** `PurchasingReq` e `Quotation` derivam de
  `PurchaseRequest` com campos muito semelhantes; avaliar um único view-model.
- **MT-5 — Cache de lookups.** Cada store refaz `getUsersLookup`/lookups; considerar
  cache compartilhado (os dados mudam pouco durante a sessão).
- **MT-6 — Padronizar validação visual** (`is-invalid`) e máscaras monetárias entre os
  formulários do módulo (ver FE-12/FE-13).

---

## Prioridade sugerida

1. **FE-1** (base de permissão) → **FE-2, FE-3, FE-4** (gates: destravam o item relatado
   e valem para todos os perfis).
2. **FE-5, FE-7** (transições de etapa que só faltam ligar ao service — baixo custo, alto
   ganho de fluxo).
3. **FE-8, FE-9** (anexos e histórico — endpoints já existem).
4. **FE-6** (cotações/análise — parte depende de BE-3).
5. **FE-10 → FE-13** (ajustes de campo/UX) e **MT-1…MT-6** (qualidade).
6. Encaminhar **BE-1…BE-5** ao backend em paralelo.
