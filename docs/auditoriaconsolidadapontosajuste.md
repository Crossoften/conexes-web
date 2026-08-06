# Auditoria Consolidada — Pontos de Ajuste do Cliente (Front × Back × Swagger)

> Base: documento **"Consolidado de Pontos de Ajuste" (04/08/2026)** confrontado com o código
> commitado (`e4b1d00`) e o Swagger da sessão. Cada ponto é classificado por **frente** e traz o
> **estado atual** + **o que ajustar**. Onde já corrigimos nesta sessão, marcamos o **patch**.
>
> **Importante:** o documento do cliente reflete testes feitos **antes** de aplicar vários patches
> desta sessão. Itens ✅ já têm patch entregue — revalidar após aplicar.

### Legenda de frente
- ✅ **Resolvido** (patch entregue nesta sessão) — revalidar
- 🔧 **Front** — ajuste só no front
- 🖥️ **Back** — depende do back (endpoint/DTO/persistência)
- 🔗 **Ambos** — front + back
- ❓ **Decisão** — produto/negócio precisa definir antes de virar tarefa
- 💡 **Melhoria** — nova funcionalidade (não é bug)

---

## 0. Bloqueadores críticos

| # | Ponto | Frente | Diagnóstico | Ação |
|---|---|---|---|---|
| B1 | **"Cargo com ID 5 não encontrado"** ao salvar Colaborador (trava Colaboradores e Compras) | 🔗 | O campo **Cargo** usa **lista fixa hardcoded** no front (`employee-new.page.ts:38-59`, ids 1–20) porque **`GET /v1/positions` não existe** (B-CO-02). O front envia `positionId` inexistente no back. | **Back:** criar catálogo de cargos (`GET /v1/positions`) — idealmente gerenciável por entidade. **Front:** trocar o fallback pelo catálogo real. |
| B2 | **Dependência circular Plano de Contas × Centro de Custo** | 🔗❓ | Confirmado: sem botão "+" para criar CC inline (`chart-of-accounts-new.page.html:53-62` é só `<select>`). Sem CC cadastrado, não cria conta. | **Front:** botão "+" ao lado de "Centro de Custo" abrindo cadastro rápido de CC. **Definição:** por onde começar (ver §1/§2). |
| B3 | **Editar Perfil de Permissão + Salvar não faz nada** | 🔗 | Wiring do front do modal de edição está **correto** (`permission-detail.modal.ts:91-109` → `updateProfile` PATCH `/v1/permission-profiles/{id}`). Causa provável: **Back** não persiste `permissions` (DTO sem schema, B-US-05) **e/ou** corrida no front (effect + `getProfileById`/`getModulesCatalog` sobrescreve edições; `applyModules` perde atribuições que não casam com o catálogo de 6 linhas vs 23 do perfil). | **Back:** tipar/persistir `permissions` no PATCH. **Front:** blindar contra corrida (não re-`patchForm` após edição iniciada) e não perder atribuições no cruzamento com o catálogo. |
| B4 | **Permissões do usuário não batem com o perfil** (perfil 23 atribuições, usuário quase sem) | 🔗 | O modal exibe **só `user.modulePermissions`** (diretas) e **nunca resolve `permissionProfileId → profile.permissions`** (`user-detail.modal.html:102-137`). Back não devolve permissões efetivas do perfil (B-US-01). | **Back:** `GET /v1/users/{id}` (ou `/my-self`) devolver permissões **efetivas** (perfil + diretas). **Front:** exibir as permissões do perfil vinculado. |
| B5 | **Compras: ações de Fornecedores na requisição não funcionam** | 🔧🖥️ | No form de nova requisição (**`features/quotations/new`**) há só checkbox `uniqueSupplier` + input `supplierCount` (`quotation-new.page.html:111-122`). **Não há seleção de fornecedores nem cotações** aqui — isso só existe no modal da Etapa 3 (`purchase-quotations.modal`). O model tem `exclusiveSupplier` que o form nunca envia. | **Front:** implementar seleção de fornecedores/cotações no fluxo; enviar `exclusiveSupplier`. **Back:** confirmar DTO. |
| B6 | **Compras: não conclui a requisição** (erro interno) + **"Nome do Item" manual** | 🔗 | Submit em `quotation-new.page.ts:168-192`. **Nenhum `valueChanges`** no componente → selecionar produto não preenche nada; `name` é `required` manual. O lookup de produtos devolve só `{id,name}` — sem dados p/ auto-preencher. Itens de serviço nunca mandam `serviceId`. Erro interno provável no payload cru (ex.: `serviceId` ausente, campos não aceitos). | **Front:** auto-preencher item ao escolher produto; sanitizar payload. **Back:** expor produto completo (`group/measure/costBase`) e informar o erro 500 real. |

> **Observação transversal (crítico de UX):** "Editar" abre em **modo visualização** exigindo 2º clique em **7 módulos** (§Transversal T1). Vale corrigir **de forma centralizada**.

---

## 1. Plano de Contas e Categorias

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 1.1 | Renomear "Categoria (Centro de Custo)" → "Centro de Custo, Projeto ou Atividade" + avaliar plano parametrizável por CC | 🔧❓ | Só trocar o `<label>` (`new.page.html:52`, `modal.html:179`); control `costCenter` → payload `category` permanece. **Definição:** plano distinto por CC é decisão de produto. |
| 1.2 | Dependência circular PC×CC — botão "+" p/ criar CC inline | 🔧 | **Falta** (ver B2). Adicionar "+" ao lado do select de CC. |
| 1.3 | "Grupo da Categoria" parece redundante com "Tipo da Categoria" | ❓ | São campos distintos: `categoryType` (enum Entrada/Saída/Totalizadora) × `categoryGroup` (texto livre). **Sobreposição real:** "Totalizadora" (em `categoryType`) vs `accountType` (Sintética/Analítica) — a distinção sintético/totalizador está espalhada. Definir com o time. |
| 1.4 | Criar subcategoria vinculada a conta Totalizadora/Sintética + campo "conta superior" | 🔧 | `parentId` **existe no payload** (`new.page.ts:47,115`) mas **não tem UI** — sempre sai `null`. Falta botão "+" de subconta e/ou campo "conta superior". |
| 1.5 | Importar plano de contas via planilha | 💡🖥️ | Não existe. Precisa endpoint de importação + UI. |
| 1.6 | Modal de edição mostra só a numeração ("Editar Conta: 1.1") | 🔧 | `modal.html:21` exibe só `account?.code`; incluir `account?.title`. |
| 1.7 | "Cancelar" na edição não volta ao ponto de origem | 🔧 | `cancelEdit()` (`modal.ts:143`) sempre vai p/ `mode='view'`; quando aberto direto em edição pela lista, deveria `close.emit()`. |
| 1.8 | Simplificar título "Cadastro de Plano de Contas e Categorias" → "Cadastro de Plano de Contas" | 🔧 | `list.page.html:5` e `new.page.html:5`. |
| 1.9 | Confirmar vínculo da conta em Fornecedores/CC/Impostos | 🔗 | Vínculo confirmado só em CC. Ver §5.1 (Stakeholder conta contábil) e §3. |

> **Double-click:** ✅ **não afeta** Plano de Contas (a lista já abre em `mode='edit'`).

---

## 2. Centro de Custo / Projeto

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 2.1 | "Tipo" deveria classificar **Sintético/Analítico** (bloquear lançamento em Sintético), válido p/ Projetos e Categorias | 🔗❓ | Hoje só Centro de Custo/Projeto. Novo conceito de sintético/analítico + regra de bloqueio (front + back). |
| 2.2 | Botão "+" em "Composição de contas vinculadas" (Origem/Caixa) não abre cadastro de Conta Bancária | 🔧 | Botão morto — ligar ao cadastro de Contas Bancárias. |
| 2.3 | Campo "Código" aceita texto/especiais; deveria ser **só números** (define hierarquia 1, 1.1…) | 🔗 | Validação client-side (front) + server-side (back). |
| 2.4 | Subníveis de Atividade (CC → Projeto → Atividade → **subnível**) e filtro | ✅⚠️ | Parcial — **patch-79** trouxe árvore de 3 níveis via `kindOf`/`parentProjectId`. Cliente quer o **4º nível** (subnível de atividade). Revalidar/estender. |
| — | (já resolvidos) entityKind canônico | ✅ | **patch-78** |
| — | Dropdowns "Código contábil"/"Fonte pagadora" | ✅ | **patch-80** (envelope `{data}` + `take=1000`) — cobre o retest **CC-2** |
| — | Edição duplicando na lista | ✅ | **patch-81** |

---

## 3. Impostos e Retenções

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 3.1 | Cadastrar fornecedor sem imposto redireciona forçado p/ "Impostos" | 🔧❓ | A tela deveria só listar quem já tem vínculo fiscal, não ser etapa obrigatória. Rever fluxo; confirmar se ocorre em Clientes. |
| 3.2 | Total não inclui ISS | ✅ | **patch-83** (ISS no total). Revalidar. |
| 3.3 | Pré-cadastrar códigos de imposto (IRRF, PCC, INSS, PIS, COFINS, CSLL, ISS) | 💡🖥️ | Hoje digitados a cada cadastro. Precisa catálogo. |
| 3.4 | Alíquota exige **ponto** (1.5); esperado **vírgula** (1,5) | 🔧 | Inputs `type="text"` com `Number()` puro (`taxes-new.page.ts:181`); `Number('1,5')`=NaN. Adicionar `replace(',','.')` + máscara. |
| 3.5 | "Salvar" inconsistente (às vezes salva, às vezes não) | 🔗 | Investigar (provável validação/estado). Ver também 3.7. |
| 3.6 | Sobreposição "Dados Gerais" (código/título do serviço) × aba "Serviços" | ❓ | Definir qual campo usar. |
| 3.7 | Dados da aba "Serviços" não persistem | 🔗 | No **stakeholder** já corrigido (**patch-91**, virou `services[]`). No módulo **taxes**, revalidar persistência do serviço. |
| 3.8 | Ao selecionar Fornecedor, preencher dados fiscais automaticamente | 🔗 | Depende de 5.2/5.3 (serviços do fornecedor). |
| 3.9 | Campo "Atividade" (em CC/Projeto/Atividade) sem opções ao salvar "Serviço" | ✅ | **patch-84/86** (activityId + selects reais). Revalidar. |

> 🔗 **Relacionamento:** Impostos consome **Stakeholders** (fornecedor), **Plano de Contas** e **Projetos/CC/Atividade**. Dado fiscal do fornecedor vive **duplicado** em `stakeholder.taxesAndServices` e `/v1/tax-service` (B-TX-07 — unificar).

---

## 4. Cadastro de Entidade

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 4.1 | CNPJ sem máscara automática | 🔧 | Sem máscara (`new.page.html:19` só placeholder). Adicionar `applyCnpjMask`. |
| 4.2 | Buscar dados na Receita Federal pelo CNPJ | 💡🖥️ | Não existe (existe em Clientes/Fornecedores). |
| 4.3 | Telefone principal/celular sem máscara | 🔧 | Sem máscara (`mainPhone`/`cellPhone`). Adicionar. |
| 4.4 | Incluir certificado digital e logo **via edição** | ✅⚠️ | Upload criado no **patch-90** (create + modal). Confirmar que o **modo edição** também permite anexar depois. |
| 4.5 | Botão "Histórico" não funciona | 🔧🖥️ | Botão **morto** (`entity-registry-list.page.html:111`, sem `(click)`). Ligar a endpoint de histórico (verificar se existe no back). |
| 4.6 | Relação matriz × filiais | ❓🖥️ | Não existe hierarquia. Decisão de produto + campo/endpoint. |
| — | Bairro (`district`) + Status | ✅ | **patch-88** |

---

## 5. Stakeholders (Fornecedores)

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 5.1 | "Conta Contábil" traz só o número (sem nome), sem pesquisa por categoria, e **não aparece após salvar** | 🔗 | `accountId` é `input number` (`stakeholder-detail.modal.html:295`); view mostra só o id (`:116`). Trocar por **select pesquisável do Plano de Contas** (mostra nome) e garantir persistência/exibição. **Depende de:** Plano de Contas. |
| 5.2 | Aba "Serviços" não salva + só permite **1 serviço** | ✅⚠️ | **patch-91** resolveu o 400 e mudou p/ `services[]` (array). Mas a **UI ainda trata só `services[0]`** — cliente quer **múltiplos serviços**. Estender a UI para N serviços. |
| 5.3 | Editar serviço já cadastrado não persiste ao reabrir | ✅ | Coberto pelo **patch-91** (lê de `services[]`). Revalidar. |
| 5.4 | Reaproveitar serviços/alíquotas de outros fornecedores | 💡🖥️ | Não existe. Precisa catálogo/fonte compartilhada. |
| 5.5 | "Salvar Rascunho" sem confirmação | 🔧 | Adicionar toast de confirmação. |

---

## 6. Conta Bancária e Bancos

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 6.1 | "Fonte pagadora" e "Código" deveriam ser opcionais | ✅ | **patch-92/93** (`payingSourceId` opcional/omitido; `code` opcional). Revalidar. |
| 6.2 | Campos de contato duplicados ("telefone contato" e "celular contato") | 🔧 | Remover duplicidade no cadastro. |
| 6.3 | Flag "Tipo de recurso" (Público/Privado) no banco | 💡🖥️ | Não existe. Campo + DTO. |
| 6.4 | Exportar dados de Banco e Conta Bancária | 💡🖥️ | Não existe. |
| — | Status + `bankName` + data sem hora (`closeDate`) | ✅ | **patch-92/93** |

---

## 7. Colaboradores e Dirigentes

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 7.1 | **[BLOQUEADOR] Cargo ID 5 não encontrado** | 🔗 | Ver **B1**. Back: `GET /v1/positions`. Front: consumir catálogo real (hoje ids 1–20 fixos). |
| 7.2 | Tela nomeada "Configurações de Parâmetros" | 🔧 | Rótulo da aba `employee-new.page.html:18`. Renomear. |
| 7.3 | Lista de cargos genérica/fixa; cada entidade tem sua nomenclatura | ❓🖥️ | Ligado a B1 — catálogo gerenciável por entidade, hierárquico, sem duplicidade. |
| 7.4 | "Vínculo" (PJ/CLT/Voluntariado) é texto livre → deveria ser **select fixo** | 🔧 | `employee-new.page.html:92-94` é `input`. Trocar por select. |
| 7.5 | "Cartão Nacional de Saúde" (CNS) obrigatório → deveria ser **opcional** | 🔧 | Remover `Validators.required` (`employee-new.page.ts:71`). |
| 7.6 | Salário sem máscara de moeda (R$) | 🔧 | `employee-new.page.html:121` sem máscara. Adicionar. |
| — | Tipo Colaborador/Dirigente + Status | ✅ | **patch-94** |
| — | Edição persistindo datas + Pagamentos | ✅ | **patch-95/96** |

---

## 8. Corpo Diretivo / Conselho Fiscal

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 8.1 | "Editar" abre em visualização (2º clique) | ✅⚠️ | O **patch-98** criou o modal de detalhe/edição com `mode` iniciando em `'view'` → **agora entra no padrão do 2º clique**. Ajustar a ação "Editar" da lista para abrir em `'edit'` (ver T1). |
| 8.2 | Não é possível adicionar/remover integrantes na edição (botões "+"/remover não agem) | ✅ | **patch-98 Lote B** implementou add/remove de integrantes no modal. Cliente testou versão anterior. Revalidar. |
| — | Enums canônicos (tipo/finalidade) + status + datas ISO | ✅ | **patch-97** |

---

## 9. Usuários e Permissões

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 9.1 | "Editar" abre em visualização (2º clique) — Perfis e Usuários | 🔧 | `mode='view'` inicial nos dois modais; a lista chama o mesmo handler p/ ver e editar. Passar `mode='edit'` (ver T1). |
| 9.2 | **[CRÍTICO] Salvar Perfil de Permissão não faz nada** | 🔗 | Ver **B3**. |
| 9.3 | **[CRÍTICO] Permissões exibidas ≠ perfil vinculado** | 🔗 | Ver **B4**. |
| 9.4 | Diferença entre "Perfil de Acesso" e "Perfil de Permissão" | ❓ | "Perfil de Acesso" = `role` (7 papéis); "Perfil de Permissão" = `permissionProfileId` (FK). Semânticas sobrepostas — o cliente definiu o perfil como fonte, mas o back ainda exige `role` (B-US-04). Decidir. |
| 9.5 | Reflexo de Alçada → permissões de Compras (US-2, a testar) | 🔗 | `purchaseRoles` é derivado de `/v1/approval-limits` e alimenta o gate de Compras. Editar alçada muda permissões (pode exigir refresh do `/my-self`). |
| — | (atenção) DELETE de usuário/perfil | 🖥️ | Front chama `DELETE /v1/users/{id}` e `/v1/permission-profiles/{id}`, mas o back **não tem** essas rotas (B-US-02). |

---

## 10. Compras — Requisições e Produtos/Serviços

> Form de nova requisição fica em **`features/quotations/new`**. Nenhum `valueChanges` existe no componente → todas as automações pedidas precisam ser criadas.

| # | Ponto | Frente | Estado / Ação |
|---|---|---|---|
| 10.1 | **[CRÍTICO] Ações de Fornecedores não funcionam** | 🔧🖥️ | Ver **B5**. |
| 10.2 | **[CRÍTICO] Não conclui requisição + Nome do Item manual** | 🔗 | Ver **B6**. |
| 10.3 | Requisitante → "Área Requisitante" automática | 🔗 | Sem `valueChanges`; lookup de usuários descarta `area`. Front: listener; Back: lookup devolver `area`. |
| 10.4 | "Data da Requisição" automática; só entrega editável | 🔧 | `requestDate` hoje é editável/obrigatório. Inicializar com hoje e travar. |
| 10.5 | "Fonte Pagadora" sem opções | 🔧🖥️ | Hoje é **input texto livre** (`quotation-new.page.html:77`) — nem é select. Criar select + endpoint. |
| 10.6 | Item: Nome/Grupo/Unidade automáticos + Valor Unitário sugerido | 🔗 | Lookup de produtos só devolve `{id,name}`. Back: expor `group/measure/costBase` (ou `GET /products-services/{id}`); Front: listener + patch. |
| 10.7 | Vincular contratos à requisição | ✅⚠️ | **Já existe** select de 1 contrato (`contractId`, `quotation-new.page.html:128-135`). Falta múltiplos/criação inline + integração com Gestão de Contratos. |
| 10.8 | Ordem financeira CC → Projeto → Categoria; ocultar CC por Projeto | 🔧❓ | Hoje Projeto → CC → Categoria, sem condicional. Reordenar + criar campo de classificação. |
| 10.9 | "Novo Produto" também cadastra serviço | 🔧❓ | Rotulado só "Produto"; existe campo Tipo Produto/Serviço mas sem UI condicional. Renomear/separar. |
| 10.10 | Campos exclusivos de produto aparecem p/ serviço | ❓🔧 | Sem `@if` por tipo. Condicionar campos. |
| 10.11 | Cadastro próprio de Grupos de Produtos | 💡🖥️ | Não existe (hoje `group` é texto livre). |
| 10.12 | Cadastro próprio de Fabricantes | 💡🖥️ | Não existe (`manufacturer` texto livre). |
| 10.13 | Lista pré-cadastrada de Unidades de Medida | 💡🖥️ | Não existe (`measure` texto livre). |
| 10.14 | Botão "+" inline em Grupo/Fabricante/Unidade | 💡🔧 | Não existe. |
| 10.15 | Importação em massa de produtos/itens via planilha | 💡🖥️ | Não existe. |
| 10.16 | Reorganizar menu de Cadastros (remover atalhos Fornecedores/CC) | 🔧 | Ajuste de menu. |
| 10.17 | Padronizar nomenclatura ("Conta Padrão"/"Conta Contábil"/"Categoria"/"Subcategoria") | ❓ | Definição transversal de termo único. |
| 10.18 | Campos monetários fora do padrão BR | 🔧 | `type="number"` sem máscara; `formatBRL()` existe mas não é usado em input. Adicionar máscara. |
| 10.19 | "Reiniciar Formulário" perto de "Salvar" (clique acidental) | 🔧 | Reposicionar ou trocar por "Salvar Rascunho". |
| — | Reiniciar/Alterar comprador/ações + histórico (nomes/de→para) | ✅ | **patch-99/100/101/102** |

---

## 11. Design / Consistência Visual (transversal)

| # | Ponto | Frente | Ação |
|---|---|---|---|
| 11.1 | Padrão de input divergente (cápsula em Stakeholders × retangular em Conta Bancária) | 🔧❓ | Definir padrão oficial com design; mapear telas. |
| 11.2 | Listagens com muito espaço vazio / empty-state pobre | 🔧 | Melhorar empty-state (ex.: Colaboradores). |

---

## 12. Transversal — correções centralizadas

| # | Ponto | Frente | Ação |
|---|---|---|---|
| T1 | **"Editar" abre em visualização (2º clique)** — **7 módulos** | 🔧 | Padronizar: a ação "Editar" da lista deve abrir o modal em `mode='edit'` (padrão já usado por **taxes/alçadas/contas bancárias/plano de contas**). **Afetados:** Entidade, Centro de Custo, Usuários, Perfis de Permissão, Colaboradores, Agências, Stakeholders — **e agora Corpo Diretivo** (após patch-98). |
| T2 | **Máscaras ausentes** | 🔧 | CNPJ + telefones (Entidade), salário (Colaborador), monetários (Compras/Produtos), alíquota BR (Impostos). Já existe base (`applyCpfMask/applyCepMask/applyPhoneMask`) para reaproveitar. |
| T3 | **Padrão monetário BR** (R$ 0.000,00) | 🔧 | Diretiva de máscara única reaproveitável em todos os inputs de valor. |

---

## 13. Pontos já conhecidos (não bloqueiam)

- **Compras — Gestor recebe 403 ao aprovar** por regra de alçada → back deveria isentar Gestor/Master/Admin (P0.1). Front já libera o botão.
- **Compras — identificação do ator** por login → **já contornado no front** via `userId` resolvido em `/v1/users` (**patch-100**); ideal é o back derivar pelo **JWT** (P0.2).
- **Impostos — dados fiscais do fornecedor duplicados** (fornecedor × tela de impostos) → unificar (B-TX-07).

---

## 14. Consolidado por frente (para o time)

### 🖥️ Back-end (pendências que dependem do servidor)
1. **`GET /v1/positions`** — catálogo de cargos (B1/7.1/7.3). **Bloqueante.**
2. **Persistir `permissions`** no `PATCH /v1/permission-profiles/{id}` (B3/9.2). **Bloqueante.**
3. **`GET /v1/users/{id}` / `/my-self`** devolver **permissões efetivas** do perfil (B4/9.3). **Bloqueante.**
4. **DELETE** de `/v1/users/{id}` e `/v1/permission-profiles/{id}` (não existem — B-US-02).
5. Requisição: expor **produto completo** (`group/measure/costBase`) e **área do requisitante** no lookup; informar erro 500 de `POST /requests` (B5/B6/10.3/10.6).
6. Endpoint de **Fonte Pagadora** (10.5); **Histórico da Entidade** (4.5).
7. Novos cadastros: **Grupos de Produtos, Fabricantes, Unidades de Medida** (10.11–10.13); **códigos de imposto** (3.3); **importações em massa** (1.5, 10.15).
8. Regras/campos: **sintético/analítico** (2.1), **código só números** server-side (2.3), **tipo de recurso** no banco (6.3), **exportações** (6.4), **matriz/filial** (4.6), **Receita Federal** (4.2).
9. Compras (conhecidos): isenção de alçada p/ Gestor no approve (P0.1); derivar ator por JWT (P0.2); unificar impostos do fornecedor (B-TX-07).

### 🔧 Front-end (sem depender do back)
1. **T1 — abrir "Editar" em `mode='edit'`** nos 7+1 módulos (centralizado).
2. **Máscaras (T2/T3):** CNPJ + telefones (Entidade), salário (Colaborador), monetários (Compras/Produtos), alíquota vírgula (Impostos 3.4).
3. **Plano de Contas:** botão "+" CC inline (1.2), UI de subconta/`parentId` (1.4), header com título (1.6), Cancelar volta à origem (1.7), renomear título (1.8) e rótulo do campo (1.1).
4. **CC:** ligar botão "+" de contas bancárias (2.2), validar código só números (2.3), estender subnível de atividade (2.4).
5. **Colaborador:** renomear aba (7.2), Vínculo select (7.4), CNS opcional (7.5).
6. **Stakeholder:** conta contábil como select pesquisável do Plano de Contas + exibir nome (5.1); **UI de múltiplos serviços** (5.2); toast de rascunho (5.5).
7. **Banco:** remover contato duplicado (6.2).
8. **Compras/Requisição:** auto-preencher item (10.2/10.6) e área (10.3), data automática (10.4), select de fonte pagadora (10.5), reordenar/condicionar financeiros (10.8), reposicionar "Reiniciar" (10.19), seleção de fornecedores (B5).
9. **Produtos/Serviços:** renomear/condicionar por tipo (10.9/10.10), botões "+" inline (10.14), reorganizar menu (10.16).
10. **Design:** padrão de input (11.1), empty-states (11.2).

### ❓ Decisões de produto/negócio (antes de virar tarefa)
- Plano parametrizável por CC (1.1); Grupo × Tipo × Sintético/Analítico (1.3/2.1); por onde começar PC×CC (B2).
- "Perfil de Acesso" × "Perfil de Permissão" (9.4); catálogo de cargos por entidade (7.3).
- Redirecionamento forçado a Impostos (3.1); sobreposição Dados Gerais × Serviços (3.6); nomenclatura única (10.17); matriz/filial (4.6); telas separadas Produto/Serviço (10.9/10.10); padrão de input oficial (11.1).

---

_Gerado a partir do "Consolidado de Pontos de Ajuste" (04/08/2026) × código commitado × Swagger da sessão. Itens ✅ têm patch entregue — revalidar em homologação após aplicar. Próximo passo: priorizar com o cliente e abrir os lotes de implementação (front) e as demandas de back._
