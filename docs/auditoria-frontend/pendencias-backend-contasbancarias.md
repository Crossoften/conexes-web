# Pendências de Back-end — Entidades - Contas bancárias

> Auditoria Front × Back × Swagger × PPT/DOCX ("ENTIDADE" + "Campos de Entidade / Dirigentes").
> Módulo com 5 sub-menus — auditados **um a um**. Este arquivo é alimentado por sub-menu.


---

## Sub-menu 2 — Contas bancárias e bancos (`/v1/institutional/bank-accounts` + `/banks`)

> Endpoints: ambos com `POST`, `GET`, `GET/{id}`, `PATCH/{id}` — **sem DELETE**.
> Conta (`CreateBankAccountFullDto`) **obrig.: `entityId, bankId, agency, account, accountType`**.
> Banco (`CreateBankDto`): `name` (req), `code`. Front usa `environment.apiUrl` (ok).

### B-BK-01 🔴 ALTA — Sem `DELETE` em contas e bancos
O front chama `DELETE` nos dois (ações "Excluir"). Adicionar `DELETE` **ou** inativação por `status`.

### B-BK-02 🔴 ALTA — `status` não existe no contrato
Nem no DTO nem na resposta documentada — mas o front exigia e **renderizava sem guarda**
(`statusConfig[item.status].variant`) → risco de crash. **Removido do front no Patch 25.**
Definir se contas/bancos têm `status`.

### B-BK-03 🟠 MÉDIA — `code` / `closingDate` / `bankName`
Não estão no DTO; confirmar se a resposta os retorna (o front exibe `code`/`bankName` e filtra por `code`).

### B-BK-04 🟠 MÉDIA — `entityId` × `payingSourceId`
O DTO tem os dois **separados**, mas o front manda **o mesmo valor** (Fonte Pagadora) nos dois.
Confirmar: a entidade dona da conta é sempre a fonte pagadora?

### B-BK-05 🟠 MÉDIA — Obrigatoriedade
Back exige 5 campos; o front exige ~11 (openDate, apelido, saldo, telefones, email). Alinhar.

### B-BK-06 🟡 BAIXA — Schema da listagem
O front trata `{accounts,banks}` **ou** array; documentar o retorno de `GET /bank-accounts`.

### B-BK-07 🟡 BAIXA — Campos de Boleto
`boletoSequential, beneficiaryCode, wallet, convCollectionNumber, walletVariation, modality`
existem no DTO, mas o front os mantém **disabled** e envia vazios. Definir quem preenche o boleto.

### Resumo (Sub-menu 2)
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-BK-01 (sem DELETE), B-BK-02 (`status` inexistente) |
| 🟠 Média | B-BK-03 (`code`/`closingDate`), B-BK-04 (`entityId`×`payingSource`), B-BK-05 (obrigatoriedade) |
| 🟡 Baixa | B-BK-06 (schema da lista), B-BK-07 (Boleto disabled) |

**Já aplicado (Patch 25, sem depender do Back):** remoção de `status` (filtro/coluna/badge/config/
getters) — elimina o crash da lista (F-BK-01/1a); modal de conta busca `getById` ao abrir (F-BK-03).
`accountType` (real, no enum do DTO) mantido. Delete **já honesto** (só remove no sucesso) — segue
inoperante até B-BK-01.
**Aguarda Back (Front):** delete honesto/visível quando houver endpoint (F-BK-02, dep. B-BK-01);
separar `entityId`/`payingSource` (F-BK-04, dep. B-BK-04); aba Boleto (F-BK-05, dep. B-BK-07);
obrigatoriedade (F-BK-06, dep. B-BK-05).

## Sub-menu 3 — Colaboradores e dirigentes
_(a auditar)_

## Sub-menu 4 — Corpo diretivo
_(a auditar — Tipo: Conselho Fiscal / Corpo Diretivo / Responsável; Finalidade: Ajuste / Prestação de Contas)_

## Sub-menu 5 — Anexos da entidade
_(a auditar — CNDs com validade/notificação; Regulamento de Compras com tipo de veículo de publicação)_
