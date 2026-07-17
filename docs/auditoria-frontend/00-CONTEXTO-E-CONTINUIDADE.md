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
| 7 | **Entidades** (5 sub-menus) | `features/entity-registry` (+ bank-accounts, employees…) | `/v1/institutional/entities` | 🟡 Sub-menu 1 (Cadastro): Patch 21 · Back B-EN-01..06 · sub-menus 2–5 pendentes |

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
**Back:** `pendencias-backend-entidades.md` (B-EN-01..06). 🔴 sem DELETE/Inativar (B-EN-01), findAll enxuto (B-EN-02), Bairro + upload cert/logo (B-EN-03).
**Aguarda Back (Front):** uploads de certificado/logo (F-EN-02), campo Bairro (F-EN-03), obrigatoriedade do contador (F-EN-04), tratamento do delete (F-EN-09).
**Próximo:** sub-menu 2 — Contas bancárias e bancos.

## 14. Acoplamento entre módulos
Ver `01-acoplamento-entre-modulos.md`.
