# Demandas de Backend — Módulo de Usuários e Permissões (`/v1/users`, `/v1/permission-profiles`)

> Lista **priorizada** do que o backend precisa ajustar/confirmar para o módulo de
> Usuários aderir 100% ao front. Formato: **endpoint/DTO · limitação atual ·
> alteração sugerida · impacto**.
>
> Contexto: na re-auditoria o front já reflete o contrato (papéis canônicos,
> `username`, `entityId`, `permissionProfileId`, matriz via catálogo de módulos,
> senha opcional). As pendências abaixo são de **tipagem de contrato** — o Swagger
> deixa as listagens sem schema, e foi isso que gerou o bug de paginação corrigido
> no front (FE-U1).
>
> Prioridades:
> - **P0 — Bloqueante:** trava o fluxo em produção.
> - **P1 — Essencial:** o front precisa "adivinhar" o shape; risco de quebra quando o back mudar.
> - **P2 — Desejável / Confirmar:** melhora consistência ou precisa de validação em homologação.

---

## P0 — Bloqueantes

*(Nenhum bloqueante.)*

---

## P1 — Essenciais

### B-US-01 · Listagens retornam `200` sem schema tipado
- **Endpoints:** `GET /v1/users`, `GET /v1/permission-profiles`, `GET /v1/permissions` — todos com `responses.200 = {"description":""}` (sem `content`/`schema`).
- **Limitação:** o contrato não declara o envelope. O front precisou assumir o formato; ao assumir `total` (em vez de `count`), a **paginação parou de navegar** (total sempre 0 → 1 página). Já corrigido no front lendo `count` de forma tolerante (FE-U1), mas o contrato continua ambíguo.
- **Alteração sugerida:** tipar as três listagens com o **mesmo envelope dos demais módulos**: `{ data: T[], count: number, pages: number }` (ver `ResponseFindAllStakeholderDto`, `ResponseFindAllApprovalLimitDto`, etc.). Idealmente criar `ResponseFindAllUserDto` e `ResponseFindAllPermissionProfileDto`.
- **Impacto:** sem o schema, qualquer mudança de nome de campo no back volta a quebrar a paginação silenciosamente.

### B-US-02 · `GET /v1/users/{id}` (detalhe) sem schema
- **Endpoint:** `GET /v1/users/{id}` — summary diz "Detalhar um usuário, permissões e alçadas", mas `responses.200` não tem schema.
- **Confirmar/expor:** que o detalhe devolve `modulePermissions[]`, `permissionProfileId`, `entityId`, `username` e as **alçadas** do usuário. O modal de edição depende desses campos para pré-preencher (a lista `findAll` pode vir enxuta).
- **Impacto:** se algum desses campos não vier, o modal abre sem a matriz/perfil/entidade corretos.

---

## P2 — Desejável / Confirmar em homologação

### B-US-03 · `GET /v1/permissions/modules-catalog` sem schema
- **Endpoint:** `GET /v1/permissions/modules-catalog` — "Catálogo oficial de módulos/subMenus (Função/Grupo)".
- **Confirmar:** o shape exato (ex.: `[{ module, subMenus: [{ subMenu }] }]` ou lista plana `[{ module, subMenu }]`). O front tem normalizador defensivo (`normalizeCatalog`) que aceita várias formas e cai em `DEFAULT_MODULES` se vier vazio, mas padronizar evita divergência entre a matriz e o que o back valida.
- **Impacto:** baixo (normalizador cobre), mas a matriz de permissões fica dependente de convenção não documentada.

### B-US-04 · Filtro `status` no `findAll` (confirmação)
- **Endpoint:** `GET /v1/users` aceita `status` (Active/Pending/Inactive) — o front passou a enviá-lo server-side (FE-U2).
- **Confirmar:** que o back de fato filtra por `status` (e por `role`/`name`) e pagina o resultado filtrado. Se algum não filtrar server-side, a lista fica inconsistente com a paginação.

### B-US-05 · Retornos de `POST`/`PATCH` não tipados
- **Endpoints:** create/update de usuário e de perfil retornam `200/201` sem schema.
- **Desejável:** tipar com o objeto criado/atualizado (usuário/perfil completo), para o front poder atualizar a lista sem refetch.

---

## Referência — contrato atual (Swagger)
- **Usuário (`CreateUserManagementDto`/`UpdateUserManagementDto`):** `name*`, `email*`, `surname`, `username`, `document`, `jobTitle`, `area`, `phone`, `role?` (7 papéis; omitido → Operational), `status`, `password?` (omitida → gerada e enviada por e-mail), `entityId`, `permissionProfileId`, `modulePermissions[]`.
- **Papéis (enum):** `Master | Admin | Backoffice | EntityManager | ProcurementManager | Finance | Operational`.
- **Permissão de módulo (`CreateModulePermissionDto`):** `module*`, `subMenu`, `canView`, `canCreate`, `canEdit`, `canDelete`, `isUnlimited`.
- **Perfil (`CreatePermissionProfileDto`):** `name*`, `description`, `permissions[]` (`ProfileModulePermissionDto`, mesmo shape acima).
- **Rota canônica:** `/v1/users` (o `/v1/user-management` é mantido por compatibilidade).
