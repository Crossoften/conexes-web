# Pendências de Back-end — Corpo diretivo

> **Módulo:** Entidades · **Sub-menu 4:** Corpo diretivo / Conselho Fiscal (`features/positions`).
> Auditoria Front × Back × Swagger × DOCX (Dirigentes).
> Endpoint: `/v1/institutional/governing-bodies` — **só `POST`** ("Cadastrar consolidação do
> corpo diretivo/conselho") **e `GET`** ("Listar corpo diretivo e conselho fiscal").
> **Não há GET/{id}, PATCH nem DELETE.** `CreateGoverningBodyDto` **obrig.: `entityId,
> electionDate, type`**; `members[]` = `{collaboratorId(req), startDate(req), endDate}`
> (colaboradores). Usa `environment.apiUrl` (ok).

---

## B-CD-01 🔴 ALTA — Falta CRUD (só há POST + GET)
O DOCX pede **Visualizar / Editar / Excluir** por registro, mas o contrato só cadastra e lista.
Adicionar **`GET/{id}`, `PATCH/{id}` e `DELETE/{id}`** (ou inativação). Sem isso a tela é apenas
criar + listar — as ações de linha foram **escondidas no Patch 29** por não terem endpoint.

## B-CD-02 🟠 MÉDIA — `status` não existe
O front tinha filtro de status (não-funcional). **Removido no Patch 29.** Definir se há `status`.

## B-CD-03 🟠 MÉDIA — Enums e obrigatoriedade
`type` e `purpose` são **strings livres** no DTO. Padronizar como enum conforme o DOCX:
**Tipo** = `Conselho Fiscal` / `Corpo Diretivo` / `Responsável`; **Finalidade** = `Ajuste` /
`Prestação de Contas`. O front já usa esses valores fixos (Patch 29). Confirmar também a
obrigatoriedade (back exige `entityId/electionDate/type`; o front exige ainda `purpose`+`description`).

## B-CD-04 🟡 BAIXA — Schema de `findAll`
Documentar o retorno da listagem (traz `members`? `status`?).

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-CD-01 (GET/{id} + PATCH + DELETE) |
| 🟠 Média | B-CD-02 (status), B-CD-03 (enums/obrigatoriedade) |
| 🟡 Baixa | B-CD-04 (schema) |

### Pendências de Front (aguardam Back)
Ações Visualizar/Editar/Excluir por registro (F-CD-01, dep. B-CD-01 — hoje escondidas).
**Já aplicado (Patch 29, sem depender do Back):** remoção do filtro de `status` (B-CD-02);
ocultação das ações não-funcionais; **"Responsável"** adicionado ao Tipo; **Finalidade** virou
select (Ajuste/Prestação de Contas); remoção do control `celular` morto e do `positions.mock.ts`.
Integrantes puxam de `/v1/institutional/collaborators` (acoplamento com o sub-menu 3).
