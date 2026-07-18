git# Pendências de Back-end — Colaboradores e dirigentes

> **Módulo:** Entidades · **Sub-menu 3:** Colaboradores e dirigentes (`features/employees`).
> Auditoria Front × Back × Swagger × PPT/DOCX.
> Endpoints: `/v1/institutional/collaborators` — `POST` ("Cadastrar colaborador ou dirigente"),
> `GET` ("Listar colaboradores e dirigentes"), `GET/{id}`, `PATCH/{id}`. **Sem DELETE.**
> `CreateCollaboratorFullDto` **obrig.: `entityId, name, cpf`**. Usa `environment.apiUrl` (ok).
> **Não existe** `status`; **não existe** campo `type` — Colaborador × Dirigente vive em
> `responsibleType` (o front grava `COLABORADOR`/`DIRIGENTE`).

---

## B-CO-01 🔴 ALTA — Sem `DELETE` / "Inativar Pessoa"
O PPT tem a ação 🗑 **Inativar** e o front chama `DELETE` (inexistente). Adicionar `DELETE`
**ou** inativação por `status`.

## B-CO-02 🔴 ALTA — Catálogo de Cargos (`GET /v1/positions`) não existe
O front carrega os cargos de `GET /v1/positions`, que **não está no contrato** → cai numa
**lista hardcoded** (20 cargos). Expor um endpoint de cargos/positions.

## B-CO-03 🔴 ALTA — Pagamentos do colaborador (💵)
O PPT pede uma visão de **pagamentos recebidos** (relatório simplificado: competência / data /
valor). Não há endpoint. **Pergunta de negócio do PPT:** esses dados podem vir direto dos
lançamentos de **Contas a Pagar** (sem redigitar)? Definir a fonte e o endpoint.

## B-CO-04 🟠 MÉDIA — `status` não existe no contrato
O front tinha filtro de status (não-funcional). **Removido no Patch 27.** Definir se colaborador
tem `status` (Ativo/Inativo) — liga-se ao B-CO-01 (Inativar).

## B-CO-05 🟠 MÉDIA — Discriminador Colaborador × Dirigente
Hoje via `responsibleType` (string livre; front grava `COLABORADOR`/`DIRIGENTE`). Confirmar se é
o discriminador oficial ou se deve virar um campo `type` (enum) próprio.

## B-CO-06 🟠 MÉDIA — Obrigatoriedade
Back exige só `entityId, name, cpf`; o front exige ~15 campos. Alinhar as regras.

## B-CO-07 🟡 BAIXA — `title` × `responsibleType` (e `email` × `institutionalEmail`)
O front enviava o **tipo** (COLABORADOR/DIRIGENTE) tanto em `responsibleType` quanto em `title`;
`title` deveria ser o cargo/título. **Corrigido no Patch 27** (create envia `title` vazio; edit
preserva o existente) — falta o Back definir **o que `title` deve conter** e a fonte. Idem: o
front usa `email` = `institutionalEmail` (não há campo `email` genérico no formulário).

## B-CO-08 🟡 BAIXA — Schema de `findAll`/`{id}`
Documentar o retorno (traz todos os campos do model? `status`?).

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-CO-01 (DELETE/Inativar), B-CO-02 (Cargos), B-CO-03 (Pagamentos 💵) |
| 🟠 Média | B-CO-04 (status), B-CO-05 (Colaborador/Dirigente), B-CO-06 (obrigatoriedade) |
| 🟡 Baixa | B-CO-07 (title/email), B-CO-08 (schema) |

### Pendências de Front (aguardam Back)
Delete honesto quando houver endpoint (F-CO-01, dep. B-CO-01); trocar Cargos hardcoded pelo
endpoint (F-CO-03, dep. B-CO-02); Parceria como select (F-CO-06); tela de Pagamentos (dep. B-CO-03).
**Já aplicado (Patch 27, sem depender do Back):** remoção do `status` (filtro + model + badge/getters
do modal); modal abre via `getById` (F-CO-04); `title` deixa de receber o tipo — create vazio / edit
preserva (F-CO-02); remoção do mock morto (F-CO-07). Filtro por **Tipo** (`responsibleType`) mantido.
