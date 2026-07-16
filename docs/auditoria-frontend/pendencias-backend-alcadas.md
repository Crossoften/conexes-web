# Pendências de Back-end — Alçadas de Aprovação (`/v1/approval-limits`)

> Auditoria Front × Back × Swagger × PDF ("Alçadas de Aprovação – Financeiro / Compras").
> Contrato atual (`CreateApprovalLimitDto` / `UpdateApprovalLimitDto`): `description` (req),
> `level:number` (req), `minValue` (req), `maxValue` (req), `purchaseRole?` (enum, **opcional**),
> `userId` (req). Endpoints: `POST`, `GET` (params **só** `userId/skip/take`), `GET/{id}`,
> `PATCH/{id}`, `DELETE/{id}`, `GET /export/excel`.
>
> **Decisão de modelagem (cliente):** manter **um único endpoint** `/v1/approval-limits`
> com um **discriminador `type`** (`FINANCEIRO` | `COMPRAS`) e campos condicionais por tipo —
> em vez de dois endpoints separados.

---

## Contexto de negócio — são **dois formulários** distintos (PDF)

| | **Financeiro** (autorização de pagamento) | **Compras** |
|---|---|---|
| Nível | **1 a 5 e Gestor** | 1 a 4 |
| Papel no processo de compras | — (não se aplica) | Requisitante · Comprador · Supervisor de Requisição · Supervisor de Compras · Receptor de Pedido INF · Financeiro · Gestor |
| Centro de Custo / Projeto / Atividade | — | **seleção (3 campos)** |
| Ações | Editar · Visualizar · Excluir | Editar · Visualizar · Excluir · **Copiar** · **Transferir Responsabilidade** |

O contrato atual é **único e indiferenciado** e não distingue os dois formulários.

---

## B-AL-01 🔴 ALTA — Discriminador `type` (Financeiro × Compras)
Adicionar campo obrigatório `type` (`FINANCEIRO` | `COMPRAS`) ao create/update/response e
permitir **filtrar a listagem por `type`**. Sem ele, não é possível separar/listar os dois
formulários nem aplicar validações condicionais.

## B-AL-02 🔴 ALTA — Nível "Gestor" (Financeiro) não é representável
No Financeiro o nível é **1–5 e Gestor**, mas `level` é `number`. Opções:
(a) `level` como enum/string aceitando `Gestor`; (b) flag `isManagerTier: boolean`.
⚠️ Definir semântica: em **Compras**, "Gestor" é o **papel** (`Manager`); no **Financeiro** é **nível**.

## B-AL-03 🔴 ALTA — Campos de Compras ausentes (CC / Projeto / Atividade)
Faltam `costCenterId`, `projectId`, `activityId` (opcionais, só quando `type=COMPRAS`).
Fonte: `/v1/projects` (`entityKind` `centro_de_custo` / `projeto` / `atividade`) — mesma do
módulo Centro de Custo. Liga-se ao **B-CC-01** (Atividade como 3º nível).

## B-AL-04 🟠 MÉDIA — `purchaseRole` condicional por tipo
`purchaseRole` é **opcional** no contrato, mas deveria ser **obrigatório em `COMPRAS`** e
**ausente/ignorado em `FINANCEIRO`**. Idealmente validação condicional por `type`.

## B-AL-05 🟠 MÉDIA — Campo `status`
O contrato **não tem `status`**, mas o Front tinha filtro/coluna de status (ocultado no Patch 17).
Decidir: adicionar `status` (Active/Inactive) ao create/response **ou** confirmar que não existe.

## B-AL-06 🟠 MÉDIA — Listagem sem filtros server-side
`GET` só aceita `userId/skip/take`. O "**Filtrar**" do PDF (Compras: por CC/Projeto/Atividade,
e por `type`) e a busca exigem novos params (`type`, `costCenterId`, `projectId`, `activityId`,
`search`, `sort/order`). Hoje o Front filtra/pagina client-side.

## B-AL-07 🟡 MÉDIA — Ações "Copiar" e "Transferir Responsabilidade"
Sem endpoint. Definir:
- **Copiar:** pode ser clone client-side (novo `POST` com os mesmos dados) — confirmar.
- **Transferir Responsabilidade:** trocar o `userId` responsável (individual ou em lote?) —
  precisa de endpoint próprio ou `PATCH` documentado.

## B-AL-08 🟢 BAIXA — Schema de resposta da listagem
`GET` retorna `200` sem corpo documentado. O Front trata defensivamente **array** e
`{data,total,skip,take}`. Documentar o envelope (paginação).

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-AL-01 (discriminador `type`), B-AL-02 (nível Gestor), B-AL-03 (CC/Projeto/Atividade) |
| 🟠 Média | B-AL-04 (purchaseRole condicional), B-AL-05 (status), B-AL-06 (filtros server-side) |
| 🟡 Baixa | B-AL-07 (Copiar/Transferir), B-AL-08 (schema da listagem) |

### Notas de acoplamento
- `ResponseAllUserDto.purchaseRoles` é **derivado de `/approval-limits`** ("Papéis de alçada de
  compras derivados de /approval-limits"). O **gate de permissão de Compras** (FE-1/FE-2/FE-3) lê
  `user.purchaseRoles` → **editar alçadas afeta permissões de Compras**.
- Os selects de **Centro de Custo / Projeto / Atividade** (B-AL-03) reaproveitam a árvore de
  `/v1/projects` já usada no módulo Centro de Custo.

### Pendências de Front (aguardam Back)
Split em dois formulários por `type` (F-AL-01), nível "Gestor" no Financeiro (F-AL-02), selects
CC/Projeto/Atividade em Compras (F-AL-03), `purchaseRole` obrigatório só em Compras (F-AL-04),
ações Copiar/Transferir na lista (F-AL-08), paginação server-side (F-AL-09).
**Já aplicado (Patch 17, sem depender do Back):** remoção de mock morto, rótulo pt-BR do papel na
lista, ocultação do filtro de status não-funcional.
