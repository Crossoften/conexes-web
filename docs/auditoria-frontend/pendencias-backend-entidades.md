# Pendências de Back-end — Entidades

> Auditoria Front × Back × Swagger × PPT/DOCX ("ENTIDADE" + "Campos de Entidade / Dirigentes").
> Módulo com 5 sub-menus — auditados **um a um**. Este arquivo é alimentado por sub-menu.

---

## Sub-menu 1 — Cadastro de entidades (`/v1/institutional/entities`)

> Endpoints: `POST` (criar, com contador), `GET` (lista → **só** `id, cnpj, razão social, cidade`),
> `GET/{id}`, `PATCH/{id}`. **Sem DELETE.** `CreateEntityDto` = 27 campos (entidade + contador);
> **obrigatórios: apenas `cnpj` e `legalName`**.

### B-EN-01 🔴 ALTA — Sem `DELETE` / "Inativar"
O PPT tem a ação 🗑 **Inativar** e o front chamava `DELETE` (inexistente). Adicionar `DELETE`
**ou** inativação por `status`.

### B-EN-02 🔴 ALTA — `findAll` enxuto
Retorna só `id/cnpj/legalName/city`. A lista do front precisa ao menos de **`tradeName`**
(Nome Fantasia, coluna existente). Enriquecer o retorno **ou** documentar o schema.

### B-EN-03 🔴 ALTA — Campos ausentes no contrato
- **Bairro** (obrigatório no PPT) não existe no DTO (`address/number/complement/city/state/zipCode`).
- **Upload de arquivo** de **Certificado Digital** e **Logotipo**: só há `digitalCertPassword` e
  `logoUrl:string` — sem endpoint de upload/multipart/base64. Definir o mecanismo.

### B-EN-04 🟠 MÉDIA — `status` / `type` / `children` não existem
O front havia inventado `status` (Ativo/Inativo), `type` (PF/PJ) e hierarquia **Entidade/Filial**
(`children`). **Removidos do front no Patch 21.** Definir no back: entidade tem `status`? há
hierarquia **matriz/filial** (`parentId`/`children`)? (`type=PF/PJ` **não se aplica** — entidade é
sempre PJ/CNPJ.)

### B-EN-05 🟠 MÉDIA — Obrigatoriedade
Back exige só `cnpj`+`legalName`; o PPT marca vários (Razão Social, Nome Fantasia, Endereço,
Número, Bairro, Cidade, Estado, CEP, Email do Dirigente). Alinhar as regras.

### B-EN-06 🟡 BAIXA — Dados do Contador
Back aceita todos os campos do contador como opcionais; o front exige **todos**. Confirmar quais
são de fato obrigatórios (hoje o front bloqueia salvar sem contador completo — F-EN-04).

---

### Resumo de prioridade (Sub-menu 1)
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-EN-01 (DELETE/Inativar), B-EN-02 (findAll enxuto), B-EN-03 (Bairro + upload) |
| 🟠 Média | B-EN-04 (status/type/filial), B-EN-05 (obrigatoriedade) |
| 🟡 Baixa | B-EN-06 (obrigatoriedade do contador) |

### Pendências de Front (aguardam Back)
Uploads de certificado/logo (F-EN-02, dep. B-EN-03); campo **Bairro** (F-EN-03, dep. B-EN-03);
obrigatoriedade do contador (F-EN-04, dep. B-EN-06); tratamento honesto do delete (F-EN-09, dep.
B-EN-01).
**Já aplicado (Patch 21, sem depender do Back):** `baseUrl` → `environment.apiUrl` (F-EN-01);
remoção de status/type/filial (1a); Estado (UF) como select (F-EN-06); remoção de `console.log`
(F-EN-08), do "Salvar rascunho" no-op (F-EN-07) e do mock morto (F-EN-10).

---

## Sub-menu 2 — Contas bancárias e bancos
_(a auditar)_

## Sub-menu 3 — Colaboradores e dirigentes
_(a auditar)_

## Sub-menu 4 — Corpo diretivo
_(a auditar — Tipo: Conselho Fiscal / Corpo Diretivo / Responsável; Finalidade: Ajuste / Prestação de Contas)_

## Sub-menu 5 — Anexos da entidade
_(a auditar — CNDs com validade/notificação; Regulamento de Compras com tipo de veículo de publicação)_
