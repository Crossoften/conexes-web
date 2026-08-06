# Demandas de Back-end — Consolidado (Pontos de Ajuste do Cliente)

> Extrato **somente das pendências que dependem do Back-end**, a partir da auditoria do documento
> "Consolidado de Pontos de Ajuste" (04/08/2026) × código do front × Swagger.
> Para o time de back. Base do front: commit `e4b1d00`. API base: `https://homolog.crosoften.com:8045`.
>
> Legenda: 🖥️ **Back puro** · 🔗 **Back + Front** (o front já depende ou vai depender deste ajuste).
> Prioridade: **P0** bloqueia uso/testes · **P1** essencial · **P2** desejável/melhoria.

---

## P0 — Bloqueadores (impedem uso/testes)

### BK-1 · `GET /v1/positions` — catálogo de cargos 🔗
- **Sintoma:** salvar Colaborador retorna **"Cargo com ID 5 não encontrado"**. O front hoje usa uma **lista fixa** (ids 1–20) porque o endpoint de cargos não existe → envia `positionId` inexistente. Trava Colaboradores **e** todo o fluxo de Compras que depende de colaborador.
- **Pedido:** criar o catálogo de cargos com `GET /v1/positions` (id + nome). Idealmente **gerenciável por entidade** (cada entidade tem sua nomenclatura), hierárquico e sem duplicidade.
- **Impacto:** desbloqueia o front assim que existir (o front passa a consumir o catálogo real).

### BK-2 · `PATCH /v1/permission-profiles/{id}` não persiste `permissions` 🔗
- **Sintoma:** editar um **Perfil de Permissão** e salvar **não altera nada**. O front envia o PATCH corretamente com `permissions: ModulePermission[]`, mas as atribuições não são gravadas.
- **Pedido:** **tipar** o DTO de update do perfil no Swagger e **persistir** o array `permissions`. Confirmar o shape esperado de `ModulePermission` (`module`, `subMenu`, flags de ação).
- **Impacto:** sem isso, não há como configurar perfis de permissão.

### BK-3 · Permissões efetivas do usuário no detalhe / `/my-self` 🔗
- **Sintoma:** um usuário vinculado a um perfil com **23 atribuições** aparece **quase sem permissão**. O detalhe do usuário só reflete permissões **diretas**, não as **herdadas do perfil**.
- **Pedido:** `GET /v1/users/{id}` (e `/v1/my-self`) devolverem as **permissões efetivas** (perfil vinculado **+** diretas), resolvendo `permissionProfileId → permissions`. Documentar o campo no Swagger.
- **Impacto:** o front precisa exibir/aplicar o que o perfil concede.

### BK-4 · Requisição de Compras — não conclui (erro 500) 🔗
- **Sintoma:** mesmo com todos os campos preenchidos, `POST /v1/purchases/requests` falha com **erro interno**.
- **Pedido:** informar a **causa real do 500** (log/validação) para o front sanitizar o payload. Suspeitas do lado front a confirmar: item de **serviço** sem `serviceId`; campos opcionais enviados vazios; `exclusiveSupplier` esperado mas não enviado.
- **Impacto:** bloqueia a criação de requisição.

### BK-5 · Requisição — Fornecedores/cotações 🔗
- **Sintoma:** nenhuma ação de Fornecedores na requisição funciona (fornecedor exclusivo e seleção de três).
- **Pedido:** confirmar o **contrato** do fluxo de fornecedores/cotações na requisição — campos `uniqueSupplier` **vs** `exclusiveSupplier` **vs** `supplierCount`, e como as 3 cotações se ligam à requisição (`POST /v1/purchases/quotations` × requisição). Padronizar para o front implementar a UI.
- **Impacto:** etapa de fornecedores/cotação inutilizável no cadastro.

---

## P1 — Essenciais

### BK-6 · Lookups de Compras precisam expor mais campos 🔗
- **Produtos/Serviços** (`GET /v1/products-services`): o lookup devolve só `{id, name}`. Para auto-preencher o item da requisição (**Nome, Grupo, Unidade e Valor Unitário estimado**), expor também `group`, `measure` (unidade) e `costBase` — ou garantir `GET /v1/products-services/{id}` com esses campos.
- **Usuários** (`GET /v1/users`): expor a **`area`** do usuário, para preencher automaticamente a "Área Requisitante" ao escolher o requisitante.

### BK-7 · DELETE inexistente para Usuários e Perfis 🖥️
- O front chama `DELETE /v1/users/{id}` e `DELETE /v1/permission-profiles/{id}`, mas **essas rotas não existem** no back → exclusão retorna erro. Criar as rotas (ou definir inativação).

### BK-8 · Endpoint de "Fonte Pagadora" 🔗
- Na requisição, "Fonte Pagadora" precisa virar **select** com opções. Hoje não há endpoint/fonte de dados. Definir a origem (entidade? conta? cadastro próprio) e expor a listagem.

### BK-9 · Botão "Histórico" da Entidade 🔗
- A tela de Entidade tem o botão **"Histórico"** previsto, mas não há endpoint. Confirmar se existe histórico de entidade e expor (`GET /v1/institutional/entities/{id}/history` ou equivalente).

### BK-10 · Código do Centro de Custo — validação server-side 🔗
- O campo "Código" (que define a hierarquia 1, 1.1, 1.2…) deve aceitar **apenas números/pontuação hierárquica**. Validar **no back** também (o front fará a validação client-side).

### BK-11 · Sintético/Analítico + bloqueio de lançamento 🔗
- Classificar Centro de Custo/Projeto/Categoria como **Sintético** (totalizador, sem lançamento direto) ou **Analítico** (recebe lançamentos), com **bloqueio de lançamento** em itens sintéticos. Requer campo/enum + regra no back.

### BK-12 · Cadastro de conta com "conta superior" (parent) 🔗
- Permitir subcategoria vinculada a conta Totalizadora/Sintética via `parentId`. O front já tem o campo no payload, mas precisa confirmar que o back **aceita e valida** `parentId` na criação/edição de `/v1/account-plan`.

---

## P2 — Desejáveis / Melhorias

### BK-13 · Novos cadastros de apoio (Compras) 🖥️
- **Grupos de Produtos** (ex.: Material de Expediente, Limpeza, Insumos Hospitalares…).
- **Fabricantes** (evitar recadastro repetido).
- **Unidades de Medida** (lista pré-cadastrada: Unidade, Caixa, Pacote, Litro, Quilograma, Metro, Hora, Mês).
- Hoje `group`, `manufacturer` e `measure` são **texto livre**.

### BK-14 · Catálogo de códigos de imposto 🖥️
- Pré-cadastrar os códigos (IRRF, PCC, INSS, PIS, COFINS, CSLL, ISS) para seleção, em vez de digitação manual a cada cadastro.

### BK-15 · Importações em massa via planilha 🖥️
- **Plano de Contas** (importar contas), **Produtos** e **Itens de requisição** (modelo padrão + validação de itens já cadastrados).

### BK-16 · Busca na Receita Federal por CNPJ (Entidade) 🔗
- Preencher dados automaticamente a partir do CNPJ, como já ocorre em Clientes/Fornecedores.

### BK-17 · Banco — flag "Tipo de Recurso" (Público/Privado) 🔗
- Adicionar campo/enum no cadastro de banco.

### BK-18 · Exportações 🖥️
- **Banco** e **Conta Bancária** (não há exportação hoje).

### BK-19 · Matriz × Filiais (Entidade) 🖥️❓
- Não há hierarquia matriz/filial. Depende de **decisão de produto** + campo/relacionamento no back.

### BK-20 · Reaproveitar serviços/alíquotas entre fornecedores 🖥️
- Fonte compartilhada de serviços/alíquotas para não redigitar a cada fornecedor.

---

## Já conhecidos (registrados anteriormente)

- **BK-C1 · Aprovação de Compras — isentar Gestor da alçada por valor** (P0.1): Gestor/Master/Admin/ProcurementManager recebem **403** ao aprovar via fallback por valor. Regra do cliente: Gestor aprova qualquer valor. Isentar da checagem de faixa. **Ver `pendencias-backend-compras.md`.**
- **BK-C2 · Ator das ações de Compras via JWT** (P0.2): as ações (`restart/cancel/reject/request-changes/move/buyer/approvers`) exigem `userId` **no corpo**, validado contra `/v1/users`. O ideal é o back **derivar o ator pelo JWT** e não exigir no corpo. *(O front já contorna resolvendo o id em `/v1/users`.)*
- **BK-C3 · Impostos do fornecedor duplicados** (B-TX-07): dados fiscais vivem em `stakeholder.taxesAndServices` **e** em `/v1/tax-service`. Unificar/sincronizar em fonte única.
- **BK-C4 · Histórico de requisição — formato do `changes`**: já padronizado como array de `{field, from, to}` (o front já consome). Manter esse contrato.

---

## Resumo priorizado

| Prioridade | Itens |
|---|---|
| **P0** | BK-1 (cargos), BK-2 (persistir permissões), BK-3 (permissões efetivas), BK-4 (500 na requisição), BK-5 (fornecedores/cotação), BK-C1 (isentar Gestor) |
| **P1** | BK-6 (lookups completos), BK-7 (DELETE user/perfil), BK-8 (fonte pagadora), BK-9 (histórico entidade), BK-10 (código server-side), BK-11 (sintético/analítico), BK-12 (parentId), BK-C2 (ator via JWT), BK-C3 (impostos únicos) |
| **P2** | BK-13 (grupos/fabricantes/unidades), BK-14 (códigos de imposto), BK-15 (importações), BK-16 (Receita Federal), BK-17 (tipo de recurso), BK-18 (exportações), BK-19 (matriz/filial), BK-20 (reaproveitar serviços) |

---

_Extrato gerado a partir de `auditoria-consolidada-pontos-ajuste.md`. Cada item cruza a solicitação do cliente com o estado atual do front. Itens 🔗 destravam trabalho de front assim que entregues._
