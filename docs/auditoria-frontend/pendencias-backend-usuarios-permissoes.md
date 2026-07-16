# Pendências de Back-end — Usuários e Permissões

> Auditoria Front × Back × Swagger × PDF ("Cadastros de Usuários e Permissões").
> **Endpoints:** `/v1/users` (= `/v1/user-management`, mesmo `UserManagementController`):
> `POST`, `GET`, `GET/{id}` ("detalhar usuário, permissões e alçadas"), `PATCH/{id}` — **sem DELETE**.
> `/v1/permission-profiles`: `POST`, `GET`, `GET/{id}` ("com usuários vinculados"), `PATCH/{id}` — **sem DELETE**.
> `/v1/permissions` (permissão de módulo por usuário): CRUD completo (inclui DELETE).
>
> **Obrigatórios (`CreateUserManagementDto`):** `name, email, role, password`. Perfil: `name`.

---

## 🔴 VEREDITO — a permissão é cadastrada mas **não é aplicada**
O CRUD de Usuários/Perfis e a matriz de acessos funcionam, porém **nada no app consome
essas permissões**: `authGuard` só checa login, `/my-self` não devolve `modulePermissions`
nem o perfil, nenhuma tela lê a matriz e o menu não filtra por permissão. Tornar isso
funcional depende primariamente do Back (B-US-01).

---

## B-US-01 🔴 ALTA — `/my-self` não expõe as permissões do usuário
Retorna `role` + `purchaseRoles`, mas **não** `modulePermissions` nem o `permissionProfile`
resolvido. Sem isso o front não tem como aplicar (guard/menu/ações). **Incluir** as permissões
efetivas do usuário logado no `/my-self`.

## B-US-02 🔴 ALTA — Sem `DELETE` em usuários e perfis
Não há `DELETE /v1/users/{id}` nem `DELETE /v1/permission-profiles/{id}`. O front chama os dois
(a ação "Excluir" existe no PDF de Permissões). **Adicionar DELETE** ou inativação por `status`.
(Obs.: o front foi ajustado no Patch 19 para só dar "sucesso" com resposta OK — hoje a exclusão
retornaria erro real até o Back existir.)

## B-US-03 🔴 ALTA — Campos do formulário de negócio ausentes no contrato
O PDF ("Cadastro de usuário") tem **"Empresa*"** (também coluna na lista) e **"Usuário/Login*"**
(coluna "Login"). **Nenhum dos dois existe** em `CreateUserManagementDto` nem no retorno.
Definir: `company`/FK de entidade e `username`/`login`.

## B-US-04 🔴 ALTA — `role` obrigatório × PDF sem campo de papel
O Back exige `role` (enum), mas o formulário de negócio só tem **"Perfil de Permissões"**.
**Decisão do cliente:** o **perfil é a fonte** — tornar `role` **opcional/derivado do perfil**.
Enquanto o Back não muda, o front mantém `role` no formulário (senão o POST falha).

## B-US-05 🟠 MÉDIA — `password` obrigatório × PDF sem senha
O cadastro de negócio não tem senha, mas o Back exige `password` no create. Definir o fluxo
(convite por e-mail / definição posterior de senha, ou senha gerada). Hoje o front inventa um
campo de senha obrigatório (mín. 6).

## B-US-06 🟠 MÉDIA — Catálogo canônico de módulos/subMenus da matriz
A matriz usa uma lista **placeholder** no front (`DEFAULT_MODULES`); o PDF mostra linhas reais
(Cockpit, Gestão de Orçamento, …) sob "Acessos módulo financeiro". Expor endpoint com a árvore
oficial **Função (module) / Grupo (subMenu)**.

## B-US-07 🟠 MÉDIA — Semântica "Acesso Limitado" × `isUnlimited`
O PDF rotula a coluna **"ACESSO LIMITADO"** (limitado); o campo é `isUnlimited` (ilimitado) e o
front rotula "Acesso ilimitado". **Confirmar o significado** para não inverter a regra.

## B-US-08 🟡 BAIXA — `GET /v1/users` (findAll): filtros e schema
Confirmar se aceita `name`/`role`/`status` (o front envia) e **o corpo retornado** — se traz os
campos do model (surname, document, area, `modulePermissions`) ou só o enxuto `ResponseAllUserDto`.
(O front foi ajustado para buscar o detalhe por id ao abrir o modal — B-US-08 define se isso é
mesmo necessário.)

## B-US-09 🟡 BAIXA — `/v1/users` × `/v1/user-management` duplicados
Mesmo controller em duas rotas. Definir a canônica e documentar.

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-US-01 (/my-self sem permissões), B-US-02 (sem DELETE), B-US-03 (Empresa/Login), B-US-04 (role × perfil) |
| 🟠 Média | B-US-05 (senha/convite), B-US-06 (catálogo de módulos), B-US-07 (Acesso Limitado × isUnlimited) |
| 🟡 Baixa | B-US-08 (findAll schema/filtros), B-US-09 (rotas duplicadas) |

### Pendências de Front (aguardam Back)
Enforcement real — guard + gating de menu + consumo das permissões (F-US-01, dep. B-US-01);
remoção do `role` do formulário (dep. B-US-04); campos Empresa/Login (dep. B-US-03); substituir
`DEFAULT_MODULES` placeholder pelo catálogo real (dep. B-US-06).
**Já aplicado (Patch 19, sem depender do Back):** roleOptions do modal de edição corrigidos
(F-US-02); modal busca detalhe por id (F-US-03); toast de exclusão só no sucesso (F-US-04);
Perfil de permissão obrigatório no cadastro (F-US-05); remoção de mock morto (F-US-09).
