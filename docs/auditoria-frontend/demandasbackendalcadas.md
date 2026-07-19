# Demandas de Backend — Módulo de Alçadas de Aprovação (`/v1/approval-limits`)

> Lista **priorizada** do que o backend precisa ajustar/confirmar para o módulo de
> Alçadas aderir 100% ao front. Formato: **endpoint/DTO · limitação atual ·
> alteração sugerida · impacto**.
>
> Contexto: após o back reformular o módulo, a re-auditoria confrontou o Swagger
> atual com o front e **quase tudo já é atendido** — tipo (COMPRAS/FINANCEIRO),
> níveis com "Gestor" (`isManagerTier`), papel de compra, **escopo** (centro de
> custo / projeto / atividade), **copiar/transferir** e **paginação/filtros
> server-side** com envelope `{data,count,pages}`. As pendências abaixo são
> refinamentos de contrato e confirmações de homologação — nenhuma bloqueia o
> fluxo principal.
>
> Prioridades:
> - **P0 — Bloqueante:** trava o fluxo em produção.
> - **P1 — Essencial:** o front precisa "adivinhar" o shape ou perde funcionalidade.
> - **P2 — Desejável / Confirmar:** melhora consistência ou precisa de validação em homologação.

---

## P0 — Bloqueantes

*(Nenhum bloqueante exclusivo de Alçadas.)*

> **Ligação com Compras — Gestor isento de alçada por valor.** A regra de negócio
> confirmada pelo cliente é que **Gestor/Master/Admin (e ProcurementManager)
> aprovam qualquer valor sem depender de alçada cadastrada**. Isso é aplicado no
> fluxo de **aprovação de requisição** e está documentado como **P0.1** em
> `demandas-backend-compras.md` (regressão de 403 no fallback por valor). Registrado
> aqui apenas como referência cruzada — a correção é no `approve` de Compras, não no
> CRUD de alçadas.

---

## P1 — Essenciais

### P1.1 · `findAll` não expõe filtro/campo `status` _(B-AL-05)_
- **Endpoint:** `GET /v1/approval-limits` — parâmetros aceitos hoje: `userId, take, skip, type, costCenterId, projectId, activityId, search, sort, order`.
- **Limitação:** não há parâmetro **`status`** (nem o campo vem garantido no item da lista). A tela tem o dropdown **Ativo / Pendente / Inativo**, mas, sem suporte no back, o front só consegue filtrar **client-side na página atual** — o que é inconsistente com a paginação server-side (pode exibir menos itens que o page size ao filtrar).
- **Alteração sugerida:** adicionar `status` como (a) **query param** de filtro no `findAll` (`?status=Active|Pending|Inactive`) e (b) **campo** no item retornado (`ApprovalLimitListItemDto.status`). Enum alinhado ao front: `Active | Pending | Inactive`.
- **Impacto:** enquanto não existir, o filtro de status é **parcial** (só a página carregada). Assim que o contrato expuser `status`, o front liga o filtro no server (`buildParams()` já está preparado para mandar params extras). **Essencial para o filtro funcionar de verdade.**

---

## P2 — Desejável / Confirmar em homologação

### P2.1 · `copy` — retorno do registro criado
- **Endpoint:** `POST /v1/approval-limits/{id}/copy` (resposta `201`, corpo não tipado no Swagger).
- **Confirmar:** que a resposta traga **o registro recém-criado** (com `id` novo). Hoje o front, por segurança, **recarrega a lista** após copiar (não depende do corpo) — mas tipar o retorno permitiria otimizar (inserir sem refetch) e evita ambiguidade.
- **Impacto:** baixo (funciona via refetch). Desejável tipar `201` com o `ApprovalTier` criado.

### P2.2 · `transfer` — validação do novo aprovador
- **Endpoint:** `PATCH /v1/approval-limits/{id}/transfer` · body `TransferApprovalLimitDto { userId }`.
- **Confirmar:** o que o back valida ao transferir — se o **novo `userId`** precisa ter papel/faixa compatível com a alçada (ex.: em COMPRAS, ser `RequestSupervisor`/nível equivalente) e o que retorna em caso de incompatibilidade (mensagem em `error.message`, que o front exibe no modal). Confirmar também se a resposta traz a alçada atualizada.
- **Impacto:** o front mostra a mensagem do back no modal de transferência; só precisamos garantir que a validação e a mensagem existam.

### P2.3 · Lookups de escopo — shape `{ id, name }`
- **Endpoint:** `GET /v1/projects` com `?type=centro_de_custo` (centros de custo), sem filtro (projetos) e `?kind=atividade` (atividades) — usados pelos 3 selects de escopo (AL-4, só COMPRAS).
- **Confirmar:** que essas variações retornam itens com **`id`** e **`name`** (ou `title`). O front tem um normalizador defensivo (`scopeLookup()` aceita `name`/`title`/`id`), mas convém padronizar o contrato.
- **Impacto:** baixo (normalizador cobre variações). Desejável padronizar.

### P2.4 · Persistência do escopo no CRUD
- **Endpoint:** `POST` / `PATCH /v1/approval-limits` · DTO com `costCenterId?`, `projectId?`, `activityId?` (opcionais, só COMPRAS).
- **Confirmar:** que create/update **persistem e retornam** esses três campos, e que o `findAll`/`findOne` os devolvem — para o modal de edição pré-preencher os selects corretamente.
- **Impacto:** se o back não devolver os campos, a edição mostra escopo vazio mesmo com valor salvo.

---

## Referência — endpoints do módulo (Swagger atual)
- `GET  /v1/approval-limits` → `{ data: ApprovalLimitListItemDto[], count, pages }` — filtros: `userId, take, skip, type(COMPRAS|FINANCEIRO), costCenterId, projectId, activityId, search, sort, order(asc|desc)`.
- `GET  /v1/approval-limits/{id}`
- `POST /v1/approval-limits`
- `PATCH /v1/approval-limits/{id}`
- `DELETE /v1/approval-limits/{id}`
- `POST /v1/approval-limits/{id}/copy`
- `PATCH /v1/approval-limits/{id}/transfer` · `{ userId }`
- `GET  /v1/approval-limits/export/excel`

## Regras de domínio refletidas no front
- **Tipo:** `COMPRAS` (aprovação de requisição) ou `FINANCEIRO` (autorização de pagamento).
- **Nível:** COMPRAS `1–4`; FINANCEIRO `1–5` ou **"Gestor"** (`isManagerTier=true`, sem número).
- **Papel de compra:** obrigatório só em COMPRAS; ignorado em FINANCEIRO.
- **Escopo (CC/projeto/atividade):** opcional, só COMPRAS.
