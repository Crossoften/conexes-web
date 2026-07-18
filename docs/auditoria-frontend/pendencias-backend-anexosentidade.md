# Pendências de Back-end — Anexos da entidade

> **Módulo:** Entidades · **Sub-menu 5:** Anexos da entidade.
> Auditoria Front × Back × Swagger × PPT (p12–15).
> **Estado: NÃO CONSTRUÍDO dos dois lados.** No Front, o menu aponta para `/entity-attachments`,
> mas a rota está **comentada** em `app.routes` e a feature `features/entity-attachments`
> **não existe**. No Back, **não há endpoint de domínio** — só o upload genérico
> `POST /v1/upload/one-file` e `/v1/upload/many-files` (retornam `{fileUrl, fileKey}`), sem
> associar o arquivo à entidade nem guardar metadados.

---

## B-AN-01 🔴 ALTA — Definir os endpoints de domínio (não existem)
O PPT especifica três blocos; nenhum tem contrato. Definir:

- **CNDs da Entidade** — CRUD de certidões por entidade:
  `entityId`, `type` (enum: `CNDT` / `Federal` / `FGTS` / `Estadual` / `Municipal`),
  `fileUrl`, `expiryDate` (data de validade), `issueDate?`.
- **Regulamento de Compras** — por entidade:
  `entityId`, `published` (bool "Houve Publicação?"), `publicationVehicle`
  (enum, 10 valores: Não Informado, Diário Oficial do Município, do Estado, da União,
  Diário da Justiça Eletrônico, Portal Nacional de Compras Públicas, Jornal de Grande
  Circulação, Jornal Regional/Municipal, Quadro/Mural de Acesso Público, Site da
  Administração Direta, Outros), `fileUrl`.
- **Anexos do Termo de Fomento/Colaboração/Parceria** — lista de anexos por entidade
  (`entityId`, `fileUrl`, `description?`).

## B-AN-02 🟠 MÉDIA — Notificação de vencimento das CNDs
O PPT pede aviso do prazo de validade (email e/ou dentro da plataforma). Precisa de
mecanismo (agendamento/cron) + endpoint de listagem de **certidões a vencer** (por janela de dias).

## B-AN-03 🟡 BAIXA — Associação upload ↔ entidade
O upload genérico já existe (`/v1/upload/one-file`). Falta a **entidade de domínio** que liga o
arquivo à entidade + os metadados (tipo/validade/veículo). Reaproveitar o upload para o arquivo.

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-AN-01 (endpoints CNDs / Regulamento / Fomento) |
| 🟠 Média | B-AN-02 (notificação de vencimento) |
| 🟡 Baixa | B-AN-03 (associação upload ↔ entidade) |

### Pendências de Front (aguardam Back)
- **F-AN-01** — construir a feature `features/entity-attachments` (lista + formulários de CNDs,
  Regulamento de Compras e Anexos do Termo) quando o contrato existir (dep. B-AN-01), reaproveitando
  o `UploadService` (`/v1/upload/one-file`). Reativar a rota em `app.routes`.
**Já aplicado (Patch 30, sem depender do Back):** o item de menu "Anexos da entidade" foi
**ocultado** (rota morta) até a feature existir — evita cair em tela em branco (F-AN-02).

### Acoplamento
Anexos → `/v1/institutional/entities` (entidade dona) + `/v1/upload/*` (arquivo). O Regulamento de
Compras também se relaciona ao módulo de **Compras** (regras de publicação).
