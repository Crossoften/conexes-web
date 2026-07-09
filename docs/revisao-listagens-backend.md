# Revisão das Listagens — campos faltando nas projeções (Backend)

> Confronto entre as **colunas exibidas na UI** e o que cada endpoint de listagem
> **realmente retorna** (JSON real do console — o Swagger não tipa essas respostas).
> Onde a coluna não tem campo correspondente na projeção, é **demanda de backend**:
> incluir o campo no retorno da lista.

## 1. Órgãos Concessionários — `GET /v1/grantors`

**Retorna hoje:** `id, legalName, cnpj, address, complement, email, phone, status`

| Coluna (UI) | Campo | Situação |
|---|---|---|
| Razão Social | `legalName` | ✅ vem |
| **Nome Fantasia** | `tradeName` | 🔴 **não vem** → incluir na projeção |
| CNPJ | `cnpj` | ✅ vem |
| **Órgão Gestor** | `managingOrgan` | 🔴 **não vem** → incluir na projeção |
| E-mail | `email` | ✅ vem |

**Demanda:** incluir **`tradeName`** e **`managingOrgan`** no retorno de `GET /v1/grantors`
(ambos já existem no `CreateGrantorDto`/entidade; é só adicionar à seleção da lista).

## 2. Repasses e Parcerias — `GET /v1/partnerships`

**Retorna hoje:** `id, client, contractName, contractCode, description, approvedValue, grantor, status`

| Coluna (UI) | Campo | Situação |
|---|---|---|
| ID | `id` | ✅ vem |
| Cliente | `client` | ✅ vem |
| Nome contrato | `contractName` | ✅ vem |
| COD contrato | `contractCode` | ✅ vem |
| Descrição | `description` | ✅ vem |
| Valor aprovado | `approvedValue` | ✅ vem |
| **Valor recebido** | — | 🔴 **não vem** → incluir (soma de payables pagos?) |
| **Saldo** | — | 🔴 **não vem** → incluir (aprovado − recebido?) |

**Demanda:** incluir **`receivedValue`** e **`balanceValue`** (ou nomes equivalentes) no retorno
de `GET /v1/partnerships`. Hoje o front exibe travessão (`—`) nessas duas colunas.

## 3. Planos de Trabalho — `GET /v1/work-plans`

**Retorna hoje:** a entidade completa (title, instrumentType, status, startDate, repassValue,
grantor{legalName}, globalValue, …).

| Coluna (UI) | Campo | Situação |
|---|---|---|
| Título | `title` | ✅ vem |
| Órgão | `grantor.legalName` | ✅ vem |
| Data início | `startDate` | ✅ vem (pode vir nulo) |
| Valor repasse | `repassValue` | ✅ vem |
| **Equipe** | — | 🔴 **não vem** → incluir (ex.: `teamCount` ou resumo) |
| **Valor recebido** | — | 🔴 **não vem** → incluir (`receivedValue`) |
| Tipo | `instrumentType` | ✅ vem (pode vir nulo) |
| Status | `status` | ✅ vem |

**Demanda:** incluir **`team`/`teamCount`** e **`receivedValue`** no retorno de
`GET /v1/work-plans`. Hoje o front exibe travessão (`—`) nessas duas colunas.

## Resumo das demandas de backend

| Endpoint | Campos a incluir na projeção da lista |
|---|---|
| `GET /v1/grantors` | `tradeName`, `managingOrgan` |
| `GET /v1/partnerships` | `receivedValue`, `balanceValue` |
| `GET /v1/work-plans` | `team`/`teamCount`, `receivedValue` |

> Observação: todos os campos "recebido"/"saldo" dependem de regra de negócio
> (o que conta como recebido). Definir a regra junto ao backend.
