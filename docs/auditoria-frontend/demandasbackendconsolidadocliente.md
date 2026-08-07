# Demandas de Back-end — Consolidado (Pontos de Ajuste do Cliente)

> Extrato **somente das pendências que dependem do Back-end**, da auditoria do
> "Consolidado de Pontos de Ajuste" (04/08/2026) × front × Swagger. Para o time de back.
> Base do front: **`8941b688`**. API base: `https://homolog.crosoften.com:8045`.
> Legenda: 🖥️ **Back puro** · 🔗 **Back + Front** (o front já depende ou vai depender). Prioridade **P0/P1/P2**.

## P0 — Bloqueadores
### BK-1 · `GET /v1/positions` — catálogo de cargos 🔗
Salvar Colaborador retorna **"Cargo com ID 5 não encontrado"**. O front usa lista fixa (ids 1–20) porque o endpoint não existe → envia `positionId` inexistente. Trava Colaboradores **e** Compras. **Pedido:** catálogo de cargos (id+nome), idealmente gerenciável por entidade.

### BK-2 · `PATCH /v1/permission-profiles/{id}` não persiste `permissions` 🔗
Editar Perfil de Permissão e salvar **não altera nada**. Front envia o PATCH com `permissions: ModulePermission[]`. **Pedido:** tipar o DTO e **persistir** o array.

### BK-3 · Permissões efetivas no detalhe / `/my-self` 🔗
Usuário com perfil de 23 atribuições aparece quase sem permissão (só reflete diretas). **Pedido:** `GET /v1/users/{id}` e `/my-self` devolverem permissões **efetivas** (perfil + diretas).

### BK-4 · Requisição de Compras — 500 ao concluir 🔗
`POST /v1/purchases/requests` falha com erro interno mesmo com campos preenchidos. **Pedido:** informar a **causa real** (item serviço sem `serviceId`? campo rejeitado?).

### BK-5 · Requisição — Fornecedores/cotações 🔗
Nenhuma ação de Fornecedores funciona. **Pedido:** confirmar contrato — `uniqueSupplier` × `exclusiveSupplier` × `supplierCount` e como as 3 cotações se ligam à requisição.

### BK-C1 · Aprovação — isentar Gestor da alçada por valor 🖥️ (P0.1)
Gestor/Master/Admin recebem **403** ao aprovar via fallback por valor. **Pedido:** isentar Gestor da checagem de faixa.

## P1 — Essenciais
### BK-6 · Lookups de Compras precisam expor mais campos 🔗
`GET /v1/products-services` deve expor `group`, `measure`, `costBase` (auto-preencher item). `GET /v1/users` deve expor `area` (auto-preencher "Área Requisitante").
### BK-7 · DELETE inexistente para Usuários e Perfis 🖥️
Front chama `DELETE /v1/users/{id}` e `/v1/permission-profiles/{id}` — não existem. Criar (ou inativação).
### BK-8 · Endpoint de "Fonte Pagadora" 🔗
"Fonte Pagadora" da requisição precisa virar select. Definir origem e expor listagem.
### BK-9 · Histórico da Entidade 🔗
Botão "Histórico" na Entidade sem endpoint. Expor `GET /v1/institutional/entities/{id}/history` (ou equivalente).
### BK-10 · Código do Centro de Custo — validação server-side 🔗
"Código" (hierarquia 1, 1.1…) só números/pontuação — validar também no back.
### BK-11 · Sintético/Analítico + bloqueio de lançamento 🔗
Classificar CC/Projeto/Categoria como Sintético (sem lançamento) ou Analítico, com bloqueio no back.
### BK-12 · `parentId` em `/v1/account-plan` 🔗
Confirmar que o back aceita/valida `parentId` (subconta ligada a totalizadora/sintética).
### BK-C2 · Ator das ações de Compras via JWT 🖥️ (P0.2)
As ações exigem `userId` no corpo (validado contra `/v1/users`). Ideal: derivar pelo **JWT**. *(Front contorna resolvendo o id em `/v1/users`.)*
### BK-C3 · Impostos do fornecedor duplicados 🖥️ (B-TX-07)
Dados fiscais em `stakeholder.taxesAndServices` **e** `/v1/tax-service`. Unificar/sincronizar.

## P2 — Desejáveis / Melhorias
- **BK-13** cadastros de **Grupos de Produtos, Fabricantes, Unidades de Medida** (hoje texto livre).
- **BK-14** catálogo de **códigos de imposto** (IRRF, PCC, INSS, PIS, COFINS, CSLL, ISS).
- **BK-15** **importações em massa** via planilha (Plano de Contas, Produtos, Itens de requisição).
- **BK-16** busca na **Receita Federal** por CNPJ (Entidade).
- **BK-17** flag **"Tipo de Recurso" (Público/Privado)** no banco.
- **BK-18** **exportações** de Banco e Conta Bancária.
- **BK-19** **matriz × filiais** (Entidade) — depende de decisão de produto.
- **BK-20** **reaproveitar serviços/alíquotas** entre fornecedores (fonte compartilhada).

## Resumo priorizado
| Prioridade | Itens |
|---|---|
| **P0** | BK-1, BK-2, BK-3, BK-4, BK-5, BK-C1 |
| **P1** | BK-6, BK-7, BK-8, BK-9, BK-10, BK-11, BK-12, BK-C2, BK-C3 |
| **P2** | BK-13, BK-14, BK-15, BK-16, BK-17, BK-18, BK-19, BK-20 |

_Cada item cruza a solicitação do cliente com o estado atual do front. Itens 🔗 destravam trabalho de front ao serem entregues. Status vivo em `status-ajustes-consolidado.md`._
