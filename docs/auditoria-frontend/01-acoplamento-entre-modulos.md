# Acoplamento entre Módulos (cross-references)

> Registro de quando uma tela consome o endpoint de **outro módulo**, ou quando um
> módulo é **fonte** de dados para vários outros. Objetivo: prever impactos.

Legenda: **A → B** = a tela do módulo A chama o endpoint do módulo B.

---

## Dependências ativas (tela consome outro módulo)

| Origem (tela) | Consome | Para quê | Riscos |
|---|---|---|---|
| **Plano de Contas** (novo + modal) | `GET /v1/projects?take=100` | Select **"Categoria (Centro de Custo)"** (`_entityType='cost_center'`) → payload `category` | Obrigatório após Patch 07 → sem CC cadastrado, não cria conta. |
| **Centro de Custo/Projeto** (novo + modal) | `GET /v1/account-plan` | Select **"Contas vinculadas"** (`linkedAccounts[].accountPlanId`) | Muda se Plano de Contas mudar id/estrutura. |
| **Centro de Custo/Projeto** (novo + modal) | `GET /v1/institutional/entities` | Select **"Fonte pagadora"** (`payingSource`) | Semântica a confirmar. |
| **Impostos e Retenções** (lista + novo) | `GET /v1/stakeholders?take=200` | Select **"Fornecedor"** | — |
| **Impostos e Retenções** (novo) | `GET /v1/stakeholders/{id}` | **Pré-preencher** impostos do fornecedor (`taxesAndServices`) ao selecioná-lo (Patch 15) | Depende de `taxesAndServices` no detalhe do stakeholder. |
| **Alçadas de Aprovação** (novo + modal) | `GET /v1/users?take=500` | Select **"Aprovador"** (`userId`) | — |

> ⚠️ **Acoplamento circular:** Plano de Contas → Projects **e** Centro de Custo → Account-Plan.
> ⚠️ **Dado duplicado:** impostos do fornecedor vivem em `stakeholder.taxesAndServices` **e** em `/v1/tax-service` — precisa de fonte única/sync (B-TX-07).
> ⚠️ **Acoplamento reverso (derivado):** `ResponseAllUserDto.purchaseRoles` é **calculado pelo Back a partir de `/v1/approval-limits`** e alimenta o **gate de permissão de Compras** (FE-1/FE-2/FE-3). Editar uma **Alçada** altera as permissões de Compras do usuário.
> ⚠️ **Permissão de módulo NÃO aplicada:** o cadastro de **Usuários/Perfis** grava `modulePermissions`/`permissionProfile`, mas `/my-self` não os devolve e **nenhuma tela/guard os consome** (F-US-01/B-US-01). Enquanto isso, o único gate real é o de Compras (via `role` global + `purchaseRoles`).

## Dependências futuras (previstas no doc)

| Origem | Consumirá | Para quê |
|---|---|---|
| **Contas a Pagar / Receber** | hierarquia `/v1/projects` | Selects em cascata CC → Projeto → Atividade |
| **Impostos (serviços)** | grantors / cost-centers / projects | Órgão concessor, Centro de Custo, Projeto (hoje texto/ID manual) |
| **Alçadas de Compras** | hierarquia `/v1/projects` (`entityKind`) | Selects **Centro de Custo / Projeto / Atividade** (aguarda B-AL-03) |

## Módulos FONTE (consumidos via ID)

| Fonte | Campo/ID | Consumido por |
|---|---|---|
| **Plano de Contas** | `accountPlanId` | Produtos/Serviços, Compras, Orçamentos, Contas a Pagar (rateios), Projetos (`linkedAccounts`), Impostos |
| **Projetos/Centro de Custo** | `projectId`/`costCenterId` | Compras, Orçamentos, Contas a Pagar, **Plano de Contas** (Centro de Custo), **Impostos** (serviços) |
| **Stakeholders** | `stakeholderId`/`supplierId` | **Impostos**, Compras/Cotações, Contas a Pagar/Receber, Contratos |
| **Entidades** | `entityId` | Contas bancárias, Colaboradores, Parcerias, **Centro de Custo** (fonte pagadora) |
| **Órgãos Concessionários** | `grantorId` | Planos de Trabalho, Parcerias, **Impostos** (serviços, futuro) |
| **Usuários** | `userId`/`requesterId`/`buyerId` | Alçadas, Compras, Permissões |

## Regras / cuidados
- Antes de mudar o **contrato de um módulo-fonte**, checar esta tabela.
- Ao criar select dependente de outro módulo, registrar **endpoint**, **filtro** e **campo de destino**.

> _Alimentar a cada novo acoplamento descoberto._
