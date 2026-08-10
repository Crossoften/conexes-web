# Análise — Relatório de QA (08/08/2026)

> Classificação **front × back** dos 20 chamados do "Relatório de QA — Conexão 3º Setor" (homologação, 08/08/2026),
> confrontada com o código atual (`file:line`). Base do front: `8941b688` + patches 110–133.
> Legenda de frente: 🔧 **Front** · 🖥️ **Back** · 🔗 **Ambos** · ❓ **Decisão de produto**.
> Severidade conforme o relatório: 🔴 Crítica · 🟠 Alta · 🟡 Média · 🟢 Baixa.

> **Priorização (decisão do cliente):** os itens do **módulo Financeiro** (contas a pagar/receber, conciliação,
> lista de transferências, orçamentos) ficam **adiados para um pacote Financeiro dedicado** — mapeados aqui,
> mas fora da fila atual. Prioriza-se tudo que **não** é Financeiro. Afetados/adiados: **FUNC-003** (filtros
> contas a pagar/receber + busca da conciliação), **FUNC-001** (os 2 botões de excluir são de contas a
> pagar/receber), **FUNC-004** (export de contas a pagar/receber, orçamentos, transferências), **FIN-001b**
> (ligar a lista de transferências à API). *FIN-001 (form de transferência) já foi entregue no patch-138.*

## Resumo (20 chamados)

| ID | Título | Sev. | Frente | Causa raiz (resumo) |
|---|---|---|---|---|
| **SEG-001** | "Voltar" retorna à tela autenticada após login | 🔴 | 🔧 Front (+deploy) | Interceptor de 401 não limpa a sessão por completo |
| **NAV-001** | Redirecionamento inesperado ao login em 3 telas | 🟠 | 🔧 Front | Rotas comentadas; menu ainda aponta pra elas → wildcard → login |
| **API-001** | 400 não informa o motivo na UI | 🟠 | 🔗 Ambos | Sem tratamento global; front ecoa `error.message` cru |
| **I18N-001** | Mensagens técnicas em inglês | 🟡 | 🔗 Ambos (mais Back) | Back devolve texto em inglês; front exibe verbatim |
| **VAL-001** | Datas sem máscara/validação | 🟡 | 🔧 Front | Inputs de data sem máscara nem validação |
| **FUNC-001** | Excluir não funciona nas listagens | 🟠 | 🔗 Ambos | 2 botões mortos (front) + DELETE do back onde já está ligado |
| **FUNC-002** | Ordenação/filtros de coluna não respondem | 🟡 | 🔧 Front | 10 telas: `setSort` muda estado que ninguém lê |
| **FUNC-003** | Busca não pesquisa / filtros não aplicam | 🟡 | 🔧 Front | 2 filtros avançados stub + 1 busca global sem consumidor |
| **FUNC-004** | "Exportar" não funciona | 🟡 | 🔗 Ambos | 9 botões mortos (front) + endpoint de export (back) |
| **FUNC-005** | Notificação/busca do topo mockados | 🟢 | 🔧 Front | Elementos mockados |
| **UX-001** | Não cola (Ctrl+V) nos campos | 🟡 | 🔧 Front | `onlyNumbers` no keydown bloqueia colar |
| **UX-002** | Console 404 do favicon | 🟢 | 🔧 Front/deploy | Falta `favicon.ico` |
| **DASH-001** | Dashboard "Em breve" | 🟢 | ❓ Decisão | Item de roadmap |
| **CAD-001** | "Código de Classificação do Serviço" sem opções | 🟠 | 🔗 Ambos | Front sem lookup + endpoint inexistente |
| **CAD-002** | Plano de contas: 400 "category must be a string" | 🟠 | 🔧 Front | `category` recebe id numérico do CC, sem `String()` |
| **CAD-003** | "Conta superior" só "Nenhuma" | 🟡 | 🖥️ Back (dados) | Sem contas Totalizadora/Sintética nos dados |
| **CAD-004** | Senha por e-mail nunca chega | 🟠 | 🖥️ Back | Serviço de e-mail/geração de senha |
| **CTR-001** | Nova parceria: 400 + datas inválidas aceitas | 🟠 | 🔧 Front | Datas sem máscara nem conversão ISO antes do POST |
| **CMP-001** | Pedido de compra não aparece na listagem | 🟠 | 🖥️ Back | Lista recarrega ok; back não persiste/retorna a ordem |
| **FIN-001** | Transferências: dropdowns sem opções | 🟠 | 🔧 Front | Formulário é stub (selects fixos, submit é `console.log`) |

---

## Detalhamento

### 1. Transversais (afetam várias telas)

**SEG-001 — 🔴 🔧 Front (+deploy).** O `authGuard` (`core/auth/auth.guard.ts:6`) só checa `isAuthenticated()` = `_user() !== null` (signal em memória). No **caminho de 401** o `error.interceptor.ts:12` remove **apenas** `auth_user` do localStorage — **não** limpa `auth_token` nem reseta o signal `_user`. Logo `isAuthenticated()` segue `true` e o "voltar" repassa o guard e re-renderiza a tela. (O `logout()` explícito em `auth.service.ts:146` faz certo: `_user.set(null)` + remove as duas chaves.) Não há mitigação de **bfcache** (sem `pageshow`/`Cache-Control: no-store`).
→ **Ação front:** no 401 chamar o `logout()` completo (limpar token + `_user.set(null)`); adicionar re-checagem no `pageshow`/`persisted`. **Deploy:** enviar `Cache-Control: no-store` no HTML.

**NAV-001 — 🟠 🔧 Front.** As rotas `/general-settings`, `/purchasing-reports`, `/financial-reports` estão **comentadas** em `app.routes.ts:26,47,55`, mas o menu (`nav.config.ts:36,70,82`) ainda aponta pra elas → não casam rota → caem no wildcard `{ path: '**', redirectTo: 'auth/login' }` (`app.routes.ts:64`).
→ **Ação front:** implementar/descomentar as rotas **ou** remover/desabilitar os itens de menu.

**API-001 — 🟠 🔗 Ambos.** Não há tratamento global de 4xx (o `error.interceptor` só trata 401 e 403-GET). Cada form exibe `err.error.message` **cru** com fallback genérico em PT. Se o back mandar um shape sem `message`, não aparece nada.
→ **Ação front:** centralizar o tratamento (interceptor/handler compartilhado) e exibir campo+motivo. **Back:** devolver mensagem PT consistente em `message`.

**I18N-001 — 🟡 🔗 Ambos (mais Back).** As mensagens em inglês ("category must be a string", "startDate must be a valid ISO 8601") são do back e vazam verbatim.
→ **Back:** devolver mensagens em PT. **Front:** mapa de tradução/normalização como rede de segurança.

**VAL-001 — 🟡 🔧 Front.** Campos de data aceitam qualquer sequência (Contratos, Financeiro). O helper de máscara/ISO **já existe** e é usado em outros campos — falta aplicar. (Ver CTR-001.)

**FUNC-001 — 🟠 🔗 Ambos.** Botão excluir **morto** (sem `(click)`) em **accounts-payable** (`:113`) e **accounts-receivable** (`:101`) → front. Nas demais telas o excluir está ligado; onde o QA viu falhar (Alçadas de aprovação) o front chama `store.confirmDelete → svc.delete` corretamente → falha é do **DELETE do back**.
→ **Front:** ligar os 2 botões mortos. **Back:** garantir os DELETE onde já estão ligados.

**FUNC-002 — 🟡 🔧 Front (grande).** **10 telas** têm cabeçalho chamando `store.setSort()` que só muda estado — **nada lê** (sem `sorted` computed/reload): agencies, accounts-payable, accounts-receivable, budgets, financial-transfers, employees, positions, taxes, bank-accounts, purchasing-registries. (Onde funciona: chart-of-accounts, cost-centers, quotations, work-plans etc.; approval-tiers/stakeholders ordenam server-side → back.)
→ **Ação front:** implementar `sorted` computed (client) ou enviar `sort/order` no reload.

**FUNC-003 — 🟡 🔧 Front.** Filtros avançados **stub** em accounts-payable (`store filteredItems:48`) e accounts-receivable (`:45`) — retornam a lista sem filtrar. Busca global de **bank-reconciliation** (`setGlobalSearch:66`) sem consumidor. As demais buscas rápidas funcionam.

**FUNC-004 — 🟡 🔗 Ambos.** **9 botões "Exportar" mortos** (sem `(click)`): accounts-payable, accounts-receivable, budgets, employees, entity-registry, financial-transfers, positions, purchasing-registries, taxes. (bank-accounts já foi ligado no patch-116; agencies/cost-centers/chart-of-accounts/stakeholders/work-plans/approval-tiers/contract-transfers funcionam.)
→ **Front:** ligar os 9. **Back:** endpoint `/export/excel` de cada recurso.

**FUNC-005 — 🟢 🔧 Front.** Ícones de notificação e busca do topo são mockados. → Implementar ou ocultar até prontos.

**UX-001 — 🟡 🔧 Front.** `onlyNumbers` (ex.: `agency-new.page.ts:131`) no `(keydown)` retorna `false` para teclas não-dígito → Angular chama `preventDefault()` → **Ctrl+V bloqueado** (e setas/Home/End). Afeta inputs de agencies, users, employees. → Permitir `ctrlKey||metaKey` + navegação, **ou** trocar por sanitização no `(input)` com `onlyDigits()` (já existe em `shared/utils/format.ts`).

**UX-002 — 🟢 🔧 Front/deploy.** Falta `favicon.ico` → 404 no console. → Adicionar o arquivo em `public/`.

**DASH-001 — 🟢 ❓ Decisão.** Dashboard "Em breve" — item de roadmap; confirmar cronograma.

### 2. Gestão de cadastros

**CAD-001 — 🟠 🔗 Ambos.** "Código de Classificação do Serviço" (`step3.component.html:72`) e os "Cód. imposto" (`:120`) são `<select>` só com "Selecione" — **sem `@for`, sem fonte**. O `stakeholders.service.ts` não tem lookup de classificação. → **Front:** ligar o select a um lookup. **Back:** expor o catálogo (não existe hoje).

**CAD-002 — 🟠 🔧 Front.** O payload manda `category: v.costCenter` (`chart-of-accounts-new.page.ts:132`, `detail.modal.ts:208`), e `costCenter` é o **id numérico** do CC (`[value]="p.id"`; e o "+" inline faz `patchValue({costCenter: cc.id})` com número — `:92/:162`). O back valida `category` como **string** → 400 "category must be a string". → **Ação front:** enviar `String(v.costCenter)` (ou mapear o campo correto). Mensagem em inglês é o I18N-001.

**CAD-003 — 🟡 🖥️ Back (dados).** O filtro de "Conta superior" usa os valores canônicos corretos (`new.page.ts:67`: `categoryType==='Totalizadora' || accountType==='Sintetica'`). O dropdown vem vazio porque **não há contas Totalizadora/Sintética** nos dados. *Risco latente front:* o `===` estrito não casa valores legados acentuados ("Sintética") — se existirem no ambiente, vira bug de front. → **Back/dados:** cadastrar contas elegíveis. **Front (opcional):** tolerar variantes acentuadas.

**CAD-004 — 🟠 🖥️ Back.** Senha automática por e-mail nunca chega → serviço de e-mail/geração de senha no servidor.

### 3. Contratos e parcerias

**CTR-001 — 🟠 🔧 Front.** As datas principais/anexo (`contract-transfer-new.page.html:77,78,95,102-109`) são `input type=text` **sem máscara** e vão **cruas** ao payload (`...page.ts:519-521`), sem `toIso()`. O back rejeita ("startDate must be a valid ISO 8601"). O padrão certo **já existe** e está aplicado só nas datas de "contas a pagar" (`applyDateMask` `:307` + `toIso` `:278`). → **Ação front:** ligar `applyDateMask` + `toIso` nas datas principais/anexo (resolve também VAL-001 aqui). *(Há um `console.log('[cronograma]…')` a remover em `:489`.)* Mensagem em inglês = I18N-001.

### 4. Compras

**CMP-001 — 🟠 🖥️ Back.** A lista de Pedidos recarrega certo a cada visita (`purchasing-orders-list.page.ts:28` → `store.load()` → `GET /v1/purchases/orders`). Pedidos são gerados **no back** pela adjudicação (`award` → `POST /requests/{id}/award`, que retorna `PurchaseRequest`, não a ordem). Se a ordem não aparece, o back **não persistiu/retornou** a `PurchaseOrder`. → **Back.**

### 5. Financeiro

**FIN-001 — 🟠 🔧 Front.** O formulário de Transferências é um **stub**: os 3 selects (Origem/Destino/Crédito) são fixos com só "Selecione" (`financial-transfer-new.page.html:28,38,60`), **sem `@for`, sem lookup**; o componente não injeta serviço, não tem `ngOnInit` e o `onSubmit()` é `console.log` (`...page.ts:35`). → **Ação front:** implementar os lookups (contas bancárias) e o submit real. **Back:** endpoint de origem/destino se não houver.

---

## Consolidado por frente

### 🔧 Front puro (não depende do back)
- **SEG-001** (limpar sessão no 401 + bfcache) · **NAV-001** (rotas/menu) · **VAL-001**/**CTR-001** (máscara+ISO de datas) · **FUNC-002** (sort em 10 telas) · **FUNC-003** (2 filtros stub + busca global) · **CAD-002** (`String(category)`) · **UX-001** (paste) · **UX-002** (favicon) · **FUNC-005** (topo) · **FIN-001** (implementar formulário) · botões mortos de **FUNC-001** (accounts-payable/receivable) e **FUNC-004** (9 telas — a parte de ligar o botão).

### 🖥️ Back
- **CAD-004** (e-mail de senha) · **CMP-001** (persistir/retornar Pedido) · **CAD-003** (dados de contas Totalizadora/Sintética) · endpoints de **FUNC-004** (`/export/excel` por recurso) · DELETE de **FUNC-001** (onde o front já chama) · **I18N-001** (mensagens em PT) · **API-001** (mensagem consistente).

### 🔗 Ambos
- **API-001**, **I18N-001**, **FUNC-001**, **FUNC-004**, **CAD-001**.

### ❓ Decisão de produto
- **DASH-001** (cronograma do Dashboard).

---

## O que confirmar no Swagger atualizado (cross-ref pendente)
1. **Export** (`/export/excel`) para: contas a pagar, contas a receber, orçamentos, colaboradores, entidades, transferências, corpo diretivo, produtos-serviços, impostos (FUNC-004).
2. **DELETE** dos recursos onde o front já chama e falha (ex.: alçadas — FUNC-001).
3. **Catálogo de "Código de Classificação do Serviço"** e códigos de imposto (CAD-001).
4. **Lookups de contas** para Transferências (origem/destino) (FIN-001).
5. **`category` do account-plan** — confirmar tipo esperado (string?) e mensagens de validação em PT (CAD-002 / I18N-001 / API-001).
6. **Geração/persistência do Pedido de Compra** no `award` e retorno em `GET /purchases/orders` (CMP-001).
7. **Envio de e-mail** de senha no cadastro de usuário (CAD-004).

_Base: leitura do código em `8941b688` + patches 110–133. `file:line` conferidos por investigação direta._
