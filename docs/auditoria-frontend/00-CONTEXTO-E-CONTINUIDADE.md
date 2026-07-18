# Auditoria Técnica Front × Back — Contexto e Continuidade

> **Leia este arquivo primeiro ao iniciar uma nova sessão.**
> Consolida regras de trabalho, fluxo de git, estado da auditoria e acoplamentos.

---

## 1. Papel e regras (permanentes)
- **Revisor técnico + desenvolvedor Front-end**, aderência total ao Back.
- **Nunca commitar.** Entregas via **patch/diff**; commits são do usuário.
- **Nunca alterar sem aprovação explícita.**
- Fluxo por módulo: **Análise → Relatório (Front × Back) → Plano → (OK) → Patches.**
- Último **Swagger** = referência oficial. **Regras do cliente têm prioridade.**

## 2. Stack
- **Repo:** `crossoften/conexes-web` (`conexao-3-setor`). **Angular 20** (standalone + signals), `@ngrx/signals` em alguns stores.
- **API base:** `https://homolog.crosoften.com:8045`. **Auth:** `authInterceptor` (Bearer); `errorInterceptor` (401/403).
- **Estrutura:** `src/app/features/<modulo>/` com `*.model.ts`, `*.service.ts`, `*.store.ts`, `*-list.page.*`, `new/`, `components/*-detail.modal.*`.

## 3. Git — branch e fluxo
- **Branch oficial:** `ajustes-gerais-modulos` (de `compras-teste`, publicada no `origin`).
- Agente edita na **nuvem** e entrega **patches**; usuário aplica e commita local.
- Patches sequenciais: empilhar os já entregues (staged) e gerar `git diff` do novo por cima.
- Aplicar: `git apply --check <patch>` → `git apply <patch>` → `git add -A` → `git commit`.

## 4. Convenções: **F-xx** Front · **B-xx** Back (prefixo por módulo) · **A-xx** arquitetura.

## 5. Estado da auditoria

| # | Módulo | Rota Front | Endpoint | Status |
|---|---|---|---|---|
| 1 | **Stakeholders** | `features/stakeholders` | `/v1/stakeholders` | ✅ 5 patches (01–05) · Back B-01..B-12 |
| 2 | **Plano de Contas** | `features/chart-of-accounts` | `/v1/account-plan` | ✅ 2 patches (06,07) · Back B-PC-01..06 |
| 3 | **Centro de Custo/Projeto/Atividade** | `features/cost-centers` | `/v1/projects` | ✅ 6 patches (08–13) · Back B-CC-01..08 |
| 4 | **Impostos e Retenções** | `features/taxes` | `/v1/tax-service` | ✅ 2 patches (14,15) + 16 (layout) · Back B-TX-01..07 |
| 5 | **Alçadas de Aprovação** | `features/approval-tiers` | `/v1/approval-limits` | 🟡 Patch 17 (limpeza) · Back B-AL-01..08 · split de forms aguarda Back |
| 6 | **Usuários e Permissões** | `features/users` | `/v1/users` · `/v1/permission-profiles` | 🟡 Patch 19 (bugs) · Back B-US-01..09 · **enforcement inexistente** aguarda Back |
| 7 | **Entidades** (5 sub-menus) | `features/entity-registry` (+ bank-accounts, employees, positions…) | `/v1/institutional/entities` | ✅ SM1: 21+23 · SM2: 25 · SM3: 27+28 · SM4: 29 · SM5: 30 (não-construído) · Back B-EN/B-BK/B-CO/B-CD/B-AN |

## 6. Módulo 1 — Stakeholders
Patches 01–05 (limpeza, ajustes cadastro, toast, edição bancária, endereço/banco bloco completo). Back: `pendencias-backend-stakeholders.md` (entregue à parte). Impostos **embutidos no stakeholder** (decisão).

## 7. Módulo 2 — Plano de Contas
Patches 06 (vocabulário/filtro/pagesize/salvar/mock) e 07 (Grupo da Categoria + obrigatoriedade). Back: `pendencias-backend-plano-de-contas.md`.

## 8. Módulo 3 — Centro de Custo / Projeto / Atividade
Endpoint `/v1/projects` (`/v1/cost-centers` não usado). Patches 08–13: tipo canônico + `costCenterId` null, "Adicionar Subnível", startDate null (hotfix), `entityType` via `_entityType` (hotfix 404), árvore no Front + coluna Ações, subníveis como linhas completas. Back: `pendencias-backend-cost-centers.md` (B-CC-01..08). Atividade (3º nível) aguarda Back.

## 9. Módulo 4 — Impostos e Retenções
**Endpoint:** `/v1/tax-service`. Contrato só tem `POST` (createOrUpdate/upsert), `GET` (findAll), `GET /stakeholder/{id}`, `DELETE /{id}`, `export` — **não há GET/{id} nem PATCH/{id}**.
**Patches:**
- **14** corrige **edição via POST** (upsert; PATCH/{id} não existia — editar estava quebrado); calcula **Total das Retenções** (soma simples das alíquotas, IBS/CBS incluídos); page size 100/200/500; remove mock e métodos inexistentes (getById/update).
- **15** ao selecionar o **Fornecedor**, pré-preenche os impostos do cadastro dele (`stakeholder.taxesAndServices`) — direção stakeholder → tela de impostos.
**Decisões:** (1) editar via POST; (2) **manter em ambos + sincronizar** (o inverso, salvar aqui refletir no stakeholder, é Back — B-TX-07); (3) Total = soma simples; (4) Natureza da Operação e Atividade aguardam Back; (5) correções seguras. **Manter IBS e CBS** nas alíquotas (não estão no PDF, mas entram).
**Back:** `pendencias-backend-impostos-retencoes.md` (B-TX-01..07). Destaques: CRUD/POST (B-TX-01), **fonte da verdade / sync (B-TX-07)**, natureza→impostos (B-TX-03), regra do total (B-TX-05), activityId (B-TX-06).

## 10. Módulo 5 — Alçadas de Aprovação
**Endpoint:** `/v1/approval-limits`. Contrato **único e indiferenciado**: `description`, `level:number`, `minValue`, `maxValue`, `purchaseRole?` (opcional), `userId`. Endpoints POST/GET/GET{id}/PATCH{id}/DELETE{id}/export.
**Negócio (PDF) = DOIS formulários:** **Financeiro** (nível 1–5 **e Gestor**; sem papel/CC/Projeto/Atividade) e **Compras** (papel no processo, nível 1–4, Centro de Custo/Projeto/Atividade, ações Copiar/Transferir). Hoje o Front tem **um só form misturado** (título "Financeiro" mas com `purchaseRole`).
**Decisão de modelagem (cliente):** **1 endpoint + discriminador `type`** (`FINANCEIRO`|`COMPRAS`) com campos condicionais.
**Patch 17 (limpeza segura, não depende do Back):** remove mock morto (`approval-tiers.mock.ts`, shape antigo), rótulo pt-BR do papel na lista (`approvalPurchaseRoleLabel`, fonte única no model), **oculta filtro de status** não-funcional (back não expõe `status`).
**Back:** `pendencias-backend-alcadas.md` (B-AL-01..08). Alta: `type` (B-AL-01), nível Gestor (B-AL-02), CC/Projeto/Atividade (B-AL-03).
**Aguarda Back (Front):** split dos dois forms (F-AL-01), Gestor (F-AL-02), selects CC/Projeto/Atividade (F-AL-03), `purchaseRole` obrigatório só em Compras (F-AL-04), Copiar/Transferir (F-AL-08).
**Acoplamento crítico:** `users.purchaseRoles` é **derivado de `/approval-limits`** → alimenta o **gate de Compras** (FE-1/FE-2/FE-3). Mexer em alçada muda permissão de Compras.

## 11. Flag pós-Swagger (a confirmar) — Plano de Contas
O Swagger mais recente traz enums **sem acento**: `categoryType` = `Entrada`/**`Saida`**/`Totalizadora` e `accountType` = **`Sintetica`**/**`Analitica`**. O Patch 06 usou os **acentuados** (`Saída`, `Sintética`, `Analítica`). **Verificar/alinhar** o vocabulário do Front (Módulo 2) ao contrato atual antes de novos ajustes.

## 12. Módulo 6 — Usuários e Permissões
**Endpoints:** `/v1/users` (= `/v1/user-management`, mesmo controller): POST/GET/GET{id}/PATCH{id} — **sem DELETE**. `/v1/permission-profiles`: POST/GET/GET{id}/PATCH{id} — **sem DELETE**. `/v1/permissions` (permissão de módulo por usuário): CRUD completo. `/my-self` retorna `role` + `purchaseRoles`, **não** `modulePermissions`/perfil.
**Contrato usuário (`CreateUserManagementDto`):** name, surname, email, document, jobTitle, area, phone, role(enum), status(enum), password, permissionProfileId, modulePermissions[]. **Obrigatórios: name, email, role, password.** Perfil (`CreatePermissionProfileDto`): name(req), description, permissions[] (ProfileModulePermissionDto = module/subMenu/canView/canCreate/canEdit/canDelete/isUnlimited).
**🔴 VEREDITO FUNCIONAL:** as permissões são **cadastradas mas não aplicadas** — `authGuard` só checa login; `/my-self` não traz `modulePermissions`; ninguém lê a matriz; menu não filtra por permissão. Hoje o "Perfil de Permissões" é **decorativo**. Compras usa `purchaseRoles`+role global (`PurchasePermissionsService`), não a matriz.
**Decisões (cliente):** enforcement = **documentar e aguardar Back** (B-US-01); role×perfil = **Perfil é a fonte** (form exigirá só o perfil; `role` sai quando o Back tornar opcional — B-US-04); limpeza segura aprovada.
**Patch 19 (seguro, não depende do Back):** (F-US-02) corrige `roleOptions` legado do modal de edição (Manager/Operator/Viewer → enum real); (F-US-03) abre modal buscando `getUserById`/`getProfileById` (matriz não vem vazia); (F-US-04) toast de exclusão só no sucesso (store devolve Observable); (F-US-05) **Perfil de permissão obrigatório** no cadastro; (F-US-09) remove `users.mock.ts` morto.
**Back:** `pendencias-backend-usuarios-permissoes.md` (B-US-01..09). 🔴 `/my-self` sem permissões (B-US-01), sem DELETE (B-US-02), campos Empresa/Login ausentes (B-US-03), role obrigatório × PDF (B-US-04).
**Aguarda Back (Front):** enforcement (F-US-01), remoção de `role` do form (F-US-04/2a), campos Empresa/Login (F-US-06), catálogo real de módulos p/ matriz — hoje `DEFAULT_MODULES` é placeholder (F-US-07).

## 13. Módulo 7 — Entidades (5 sub-menus, um a um)
**Sub-menus:** (1) Cadastro de entidades, (2) Contas bancárias e bancos, (3) Colaboradores e dirigentes, (4) Corpo diretivo, (5) Anexos da entidade. Na UI o cadastro tem abas: Cadastro / Contador / Contas Bancárias / Colaboradores / Anexos / Regulamento de Compras.
**Endpoint (sub-menu 1):** `/v1/institutional/entities` — POST (com contador), GET (lista **só** id/cnpj/legalName/city), GET/{id}, PATCH/{id}. **Sem DELETE.** `CreateEntityDto` = 27 campos (entidade+contador); **obrigatórios só `cnpj`+`legalName`**. **Não existem** no contrato: `status`, `type` (PF/PJ), `children` (filial), **bairro**, nem upload de arquivo (só `digitalCertPassword` e `logoUrl:string`).
**Decisões (cliente):** (1a) **remover do front** status/type/filial (não existem no contrato); limpeza segura aprovada.
**Patch 21 (Sub-menu 1, seguro):** (F-EN-01) `baseUrl` hardcoded → `environment.apiUrl`; (1a) remove status/type/children + colunas/filtros + expand (filial) + badge de status no modal; (F-EN-06) Estado (UF) vira **select das 27 UFs**; (F-EN-08) remove `console.log` de debug; (F-EN-07/10) remove "Salvar rascunho" no-op + `entity-registry.mock.ts` morto.
**Patch 23 (ajustes de UI, sobre o 21):** select **Estado (UF)** alinhado ao padrão dos inputs (`.select-wrap` + chevron custom, `appearance:none`); **aviso de campos obrigatórios no modal de edição** — barra de alerta + destaque vermelho dos campos + troca automática para a aba (Geral/Contador) que contém a pendência (antes o salvar era silencioso).
**Back:** `pendencias-backend-entidades.md` (B-EN-01..06). 🔴 sem DELETE/Inativar (B-EN-01), findAll enxuto (B-EN-02), Bairro + upload cert/logo (B-EN-03).
**Aguarda Back (Front):** uploads de certificado/logo (F-EN-02), campo Bairro (F-EN-03), obrigatoriedade do contador (F-EN-04), tratamento do delete (F-EN-09).
**Sub-menu 2 — Contas bancárias e bancos** (`features/bank-accounts`; `/v1/institutional/bank-accounts` + `/banks`): duas abas (Contas/Bancos). Contrato: POST/GET/GET{id}/PATCH{id} nos dois — **sem DELETE**. Create conta (`CreateBankAccountFullDto`) obrig.: `entityId,bankId,agency,account,accountType`. **`status` não existe** (era especulativo e a lista renderizava `statusConfig[item.status].variant` sem guarda → risco de crash).
**Decisões (cliente):** (1a) remover `status` do front (mantém `accountType`, que é real); limpeza segura aprovada.
**Patch 25 (Sub-menu 2, seguro):** (F-BK-01/1a) remove `status` (filtro + coluna + badge + config + getters) → elimina o crash; (F-BK-03) modal de conta passa a buscar `getById` ao abrir; delete confirmado **já honesto** (só remove no sucesso) — segue quebrado até B-BK-01.
**Back:** `pendencias-backend-entidades.md` §Sub-menu 2 (B-BK-01..07). 🔴 sem DELETE (B-BK-01), `status` inexistente (B-BK-02); 🟠 `code`/`closingDate` (B-BK-03), `entityId`×`payingSourceId` conflados (B-BK-04), obrigatoriedade (B-BK-05); 🟡 schema da lista (B-BK-06), Boleto disabled (B-BK-07).
**Sub-menu 3 — Colaboradores e dirigentes** (`features/employees`; `/v1/institutional/collaborators`): POST/GET/GET{id}/PATCH{id} — **sem DELETE**. Create (`CreateCollaboratorFullDto`) obrig.: `entityId, name, cpf`. **Sem `status`** (removido do front). **Colaborador × Dirigente** vive em `responsibleType` (COLABORADOR/DIRIGENTE — campo real; filtro por Tipo funciona). **Cargos:** `GET /v1/positions` **não existe** → front usa lista **hardcoded**. **Pagamentos (💵)** do PPT não implementado (pergunta: vir de Contas a Pagar?).
**Decisões (cliente):** (1a) remover filtro de `status`; (2a) parar de duplicar `title` (não enviar o tipo em `title`); limpeza segura aprovada.
**Patch 27 (Sub-menu 3, seguro):** remove `status` (filtro + campo do model + badge/getters do modal); modal abre via `getById` (F-CO-04); `title` deixa de receber o tipo (create envia vazio; edit preserva o existente — B-CO-07); remove `employees.mock.ts` morto.
**Back:** `pendencias-backend-colaboradores.md` (B-CO-01..08). 🔴 sem DELETE/Inativar (B-CO-01), catálogo de Cargos inexistente (B-CO-02), Pagamentos do colaborador (B-CO-03); 🟠 status (B-CO-04), discriminador Colaborador/Dirigente (B-CO-05), obrigatoriedade (B-CO-06); 🟡 title/email (B-CO-07), schema (B-CO-08).
**Patch 28 (fix):** removida a chamada a `GET /v1/positions` (não existe — dava 404 ao abrir novo/editar colaborador); Cargos ficam na lista fixa até B-CO-02.

**Sub-menu 4 — Corpo diretivo** (`features/positions` — nome confuso; `/v1/institutional/governing-bodies`): **só POST + GET** (sem GET/{id}, PATCH, DELETE). Create (`CreateGoverningBodyDto`) obrig.: `entityId, electionDate, type`; `members[]` = colaboradores (`collaboratorId`, `startDate`, `endDate`). DOCX: Tipo = Conselho Fiscal/Corpo Diretivo/**Responsável**; Finalidade = Ajuste/Prestação de Contas. **Sem `status`.**
**Decisões (cliente):** (1a) remover filtro de status; (2a) esconder ações não-funcionais (tela vira criar+listar); ajustes de negócio + limpeza aprovados.
**Patch 29 (Sub-menu 4, seguro):** remove `status` (filtro + model); **esconde a coluna Ações** (Visualizar/Editar/Histórico eram decorativos, sem endpoint); adiciona **"Responsável"** ao Tipo; **Finalidade** vira select (Ajuste/Prestação de Contas); remove control `celular` morto + `positions.mock.ts`.
**Back:** `pendencias-backend-corpo-diretivo.md` (B-CD-01..04). 🔴 faltam GET/{id}+PATCH+DELETE (B-CD-01); 🟠 status (B-CD-02), enums/obrigatoriedade (B-CD-03); 🟡 schema (B-CD-04).
**Sub-menu 5 — Anexos da entidade** (**não construído** dos dois lados): o menu apontava para `/entity-attachments`, mas a rota está **comentada** em `app.routes` e a feature **não existe**; o Back **não tem endpoint de domínio** (só `POST /v1/upload/one-file` + `/many-files` genéricos). PPT pede: **CNDs** (tipo + validade + notificação de vencimento), **Regulamento de Compras** (publicou? + veículo de publicação, 10 opções), **Anexos do Termo de Fomento/Colaboração/Parceria**.
**Decisões (cliente):** (1a) esconder o item de menu morto; (2a) **não** construir a tela agora — aguardar o Back definir o contrato (não inventar contrato).
**Patch 30 (Sub-menu 5, seguro):** comenta o item "Anexos da entidade" no `nav.config` (rota morta) até a feature existir.
**Back:** `pendencias-backend-anexos-entidade.md` (B-AN-01..03). 🔴 definir endpoints de CNDs/Regulamento/Fomento (B-AN-01); 🟠 notificação de vencimento (B-AN-02); 🟡 domínio que associa upload↔entidade (B-AN-03).
**Módulo 7 concluído** (auditoria dos 5 sub-menus). SM5 fica bloqueado no Back para construção.

## 14. Acoplamento entre módulos
Ver `01-acoplamento-entre-modulos.md`.
