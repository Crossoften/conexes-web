# Status dos Ajustes — Consolidado (Cliente × Front × Back)

> Rastreador **vivo** de todos os pontos do documento **"Consolidado de Pontos de Ajuste" (04/08/2026)**,
> cruzando o que **já foi feito no front** (patch-NN) com o que **aguarda o back-end**.
> Base de código atual: **`8941b688`** (branch `ajustes-gerais-modulos`). Última atualização: **rodada Swagger novo + ajustes de front (07/08/2026)** — patches **110–131** entregues (BK-C2, BK-1, BK-3, BK-9, BK-16, BK-18, BK-6, BK-5, BK-2, B2, §6.2, §10.4, §10.18, §10.19, §10.16, §11.2 + UI Corpo Diretivo) + BK-7 confirmado. Ver seção final.
>
> **Uso com o Swagger novo:** os itens marcados **🖥️ BACK (BK-xx)** são o que deve ser conferido contra o
> Swagger atualizado — cada BK resolvido destrava a parte de front correspondente (🔗).

### Legenda
- ✅ **FEITO (front)** — patch entregue e aplicado nesta sessão (ou anterior). Revalidar em homologação.
- 🖥️ **BACK** — depende do servidor (ver id **BK-xx** em `demandas-backend-consolidado-cliente.md`).
- 🔧 **FRONT pendente** — ajuste de front ainda não feito.
- ❓ **DECISÃO** — produto/negócio precisa definir.
- ⏸️ **ADIADO** — deliberadamente deixado para depois.

### Patches de front desta rodada (Consolidado do cliente)
| Patch | Escopo | Base |
|---|---|---|
| **103 / 103b** | T1 "Editar" abre em edição (7 módulos + Corpo Diretivo) | 403d9a3 (commitado em 26a7250) |
| **104** | Máscaras: CNPJ/telefone (Entidade), salário (Colaborador), alíquota vírgula incl. ISS (Impostos) | 403d9a3 |
| **105** | Colaborador: aba renomeada, Vínculo select, CNS opcional | 403d9a3 |
| **106** | Plano de Contas UX: título, rótulo, header c/ nome, Cancelar, conta superior (parentId) | 403d9a3 |
| **107** | Centro de Custo: Código só números/pontos | 26a7250 |
| **108** | Stakeholder: conta contábil (select do Plano de Contas + nome) + toast rascunho | 26a7250 |
| **109** | Stakeholder: múltiplos serviços (lista add/remove) | 26a7250 (sobre 108) |
> Rodadas anteriores (78–102) cobriram a re-auditoria por módulo e o Compras (userId/histórico) — referenciadas abaixo onde aplicável.

### Patches da rodada Swagger novo (07/08/2026) — destrava por BK
| Patch | BK | Escopo | Base |
|---|---|---|---|
| **110** | BK-3 | Usuários: exibir **permissões efetivas** (perfil + diretas) + nome do perfil no detalhe | 8941b68 |
| **111** | BK-C2 | Compras: **remover `userId`** das 7 ações (ator via JWT) | 8941b68 |
| **112** | BK-1 | Colaboradores: **cargo real** via `GET /v1/positions` (remove fallback ids 1–20) | 8941b68 |
| **113** | BK-1 | Colaboradores: `title` espelha o nome do cargo (coluna "Cargo" da listagem) | sobre 112 |
| **114 / 114b** | BK-9 | Entidade: **Histórico** (botão + modal timeline) + humanização (rótulos PT, máscaras, `user` objeto) + fix select gigante do detail modal | 8941b68 |
| **115** | BK-16 | Entidade: **busca CNPJ** na Receita (pré-preenche cadastro) | sobre 114 |
| **116** | BK-18 | Banco/Conta Bancária: botão **Exportar** por aba → `/export/excel` | 8941b68 |
| **118** | BK-6 | Requisição: auto-preencher **Área Requisitante** (do usuário) + **Item** (do produto: nome/grupo/unidade/valor) | sobre 111 |
| **119** | BK-5 | Requisição: **flags de fornecedor** separadas (único/exclusivo/sem subsídio) + enviadas no payload | sobre 118 |
| **120** | BK-2 | Perfil de Permissão: **blindar corrida** do re-patch (matrixDirty + form.dirty) | 8941b68 |
| **121** | BK-2 | Usuário: mesma blindagem de corrida na matriz de `modulePermissions` | sobre 110 |
| **123** | B2 | Plano de Contas: **criar Centro de Custo inline** (modal completo reutilizável) — página nova + modal edição | 8941b68 |
| **124** | §6.2 | Banco (cadastro novo): remove campos de contato **inertes** (Telefone/Celular Contato) | 8941b68 |
| **125** | §10.4 | Requisição: **Data automática** (hoje) e readonly | sobre 118/119 |
| **126** | §10.18 | Requisição: **máscara monetária BR** (Valor Global + Valor unit. do item) | sobre 125 |
| **127** | §10.19 | Requisição: **reposiciona "Reiniciar"** (esquerda; Salvar isolado) | sobre 126 |
| **128** | §10.16 | Compras → Cadastros: **remove abas Fornecedores/CC** (deixa Produtos e Locais) | 8941b68 |
| **129** | §11.2 | **Empty-state padrão** global (6 listagens sem estilo) + Colaboradores com ícone e CTA | 8941b68 |
| **130** | UI | Corpo Diretivo: `status-badge` alinhado ao padrão de Colaboradores | 8941b68 |
| **131** | §11.2 | Empty-state rico (ícone+CTA) replicado: Stakeholders, Entidade, Corpo Diretivo, Planos de trabalho, Repasses | sobre 114 (entidade) |

---

## 0. Bloqueadores críticos
| Item | Status | Detalhe |
|---|---|---|
| **B1 — "Cargo ID 5 não encontrado"** | ✅ **112/113** (BK-1 entregue) | Back expôs `GET /v1/positions`. Front usa o catálogo real (sem ids fixos) + espelha o cargo na listagem. **Validar com catálogo populado.** |
| **B2 — Circular Plano de Contas × Centro de Custo** | ✅ **123** | Botão "+" abre modal completo de CC no cadastro de conta (página nova + edição); CC criado já fica selecionado. Quebra o deadlock. |
| **B3 — Salvar Perfil de Permissão não salva** | ✅ **120/121** (front) + 🖥️ **BK-2 validar** | Front: corrida do re-patch blindada (Perfil + Usuário). Back: DTO tipado; **confirmar persistência do PATCH** em homolog. |
| **B4 — Permissões do usuário ≠ perfil** | ✅ **110** (BK-3 entregue) | Back devolve `effectivePermissions` + `permissionProfile`. Front exibe as efetivas + nome do perfil no detalhe. |
| **B5 — Fornecedores na requisição não funcionam** | 🖥️ **BK-5** + 🔧 | Back: contrato de fornecedores/cotações. Front: implementar seleção. **Ainda não feito.** |
| **B6 — Não conclui requisição + Nome do Item manual** | 🖥️ **BK-4/BK-6** + 🔧 | Back: causa do 500 + expor produto completo. Front: auto-preencher item. **Ainda não feito.** |
| **Transversal — "Editar" abre em visualização (2 cliques)** | ✅ **103/103b** | Corrigido em 7 módulos + Corpo Diretivo. |

## 1. Plano de Contas e Categorias
| Item | Status | |
|---|---|---|
| 1.1 Renomear rótulo "Categoria (CC)" → "Centro de Custo, Projeto ou Atividade" | ✅ **106** | |
| 1.2 Circular PC×CC — botão "+" CC inline | ✅ **123** | modal completo de CC nos 2 pontos do cadastro de conta |
| 1.3 "Grupo da Categoria" × "Tipo" (redundância) | ❓ | + sobreposição com `accountType` (Sintética/Analítica) |
| 1.4 Subconta via "conta superior" (parentId) | ✅ **106** (front) / 🖥️ | Back: confirmar `parentId` em `/v1/account-plan` (**BK-12**) |
| 1.5 Importar plano via planilha | 🖥️ **BK-15** | melhoria |
| 1.6 Modal edição mostrar nome (não só código) | ✅ **106** | |
| 1.7 "Cancelar" volta à origem | ✅ **106** | |
| 1.8 Título "Cadastro de Plano de Contas" | ✅ **106** | |
| 1.9 Confirmar vínculo da conta em Fornecedor/Impostos | ✅ (stakeholder 108) / 🔧 (impostos revalidar) | |

## 2. Centro de Custo / Projeto
| Item | Status | |
|---|---|---|
| 2.1 Sintético/Analítico + bloqueio de lançamento | 🖥️ **BK-11** + ❓ | novo conceito/regra |
| 2.2 Botão "+" → abrir Contas Bancárias | ⏸️ **ADIADO** | select hoje lista Plano de Contas, não Contas Bancárias — precisa decidir semântica |
| 2.3 Código só números/pontos | ✅ **107** | |
| 2.4 Subníveis de Atividade (até 4 níveis + filtro) | ✅ (patch-79, 3 níveis) ⚠️ | confirmar 4º nível (subnível de atividade) |

## 3. Impostos e Retenções
| Item | Status | |
|---|---|---|
| 3.1 Redirect forçado p/ Impostos ao cadastrar fornecedor | 🔧 + ❓ | rever fluxo; confirmar em Clientes |
| 3.2 Total não inclui ISS | ✅ **83** | |
| 3.3 Pré-cadastrar códigos de imposto | 🖥️ **BK-14** | |
| 3.4 Alíquota aceitar vírgula (1,5) | ✅ **104** | todos os campos incl. ISS |
| 3.5 "Salvar" inconsistente | 🔧 | investigar (pode relacionar 3.7) |
| 3.6 Sobreposição Dados Gerais × Serviços | ❓ | |
| 3.7 Serviços não persistem | ✅ (stakeholder 91/108/109) / 🔧 | módulo taxes: revalidar |
| 3.8 Selecionar fornecedor auto-preenche fiscais | ✅ desbloqueado (108/109) | revalidar |
| 3.9 "Atividade" sem opções | ✅ **84/86** | |

## 4. Cadastro de Entidade
| Item | Status | |
|---|---|---|
| 4.1 CNPJ máscara | ✅ **104** | |
| 4.2 Buscar na Receita Federal por CNPJ | ✅ **115** (BK-16) | cadastro pré-preenche via `/entities/cnpj/{cnpj}`. Edição: fora do lote |
| 4.3 Telefone/celular máscara | ✅ **104** | |
| 4.4 Cert. digital + logo via edição | ✅ **90** | confirmar no modo edição |
| 4.5 Botão "Histórico" morto | ✅ **114/114b** (BK-9) | botão + modal timeline (humanizado). Validar shape em homolog |
| 4.6 Matriz × filiais | 🖥️ **BK-19** + ❓ | |
| (Bairro/`district` + Status) | ✅ **88** | |

## 5. Stakeholders (Fornecedores)
| Item | Status | |
|---|---|---|
| 5.1 Conta contábil select (Plano de Contas) + nome | ✅ **108** | |
| 5.2 Múltiplos serviços por fornecedor | ✅ **109** | |
| 5.3 Editar serviço persiste | ✅ **91/109** | |
| 5.4 Reaproveitar serviços/alíquotas | 🖥️ **BK-20** | melhoria |
| 5.5 Toast no "Salvar Rascunho" | ✅ **108** | |

## 6. Conta Bancária e Bancos
| Item | Status | |
|---|---|---|
| 6.1 Fonte pagadora / Código opcionais | ✅ **92/93** | |
| 6.2 Contato duplicado no cadastro | ✅ **124** | removidos os 2 campos de contato inertes do cadastro novo |
| 6.3 Flag "Tipo de recurso" (Público/Privado) | 🖥️ **BK-17** | |
| 6.4 Exportar Banco / Conta Bancária | ✅ **116** (BK-18) | botão Exportar por aba → `/export/excel`. Validar paths em homolog |

## 7. Colaboradores e Dirigentes
| Item | Status | |
|---|---|---|
| 7.1 Cargo ID 5 | ✅ **112/113** (BK-1) | catálogo real `GET /v1/positions` |
| 7.2 Aba "Configurações de Parâmetros" → "Dados do colaborador" | ✅ **105** | |
| 7.3 Catálogo de cargos por entidade | ✅ **112** (BK-1) / ❓ | consome o catálogo; gestão por entidade fica no back |
| 7.4 Vínculo → select fixo | ✅ **105** | PJ/PF/CLT/Voluntariado/Estágio |
| 7.5 CNS opcional | ✅ **105** | |
| 7.6 Salário máscara (R$) | ✅ **104** | |
| (Tipo Colaborador/Dirigente + Status) | ✅ **94** | |

## 8. Corpo Diretivo / Conselho Fiscal
| Item | Status | |
|---|---|---|
| 8.1 "Editar" abre em visualização | ✅ **103b** | |
| 8.2 Adicionar/remover integrantes na edição | ✅ **98** | |
| (Enums canônicos + status + datas ISO) | ✅ **97** | |

## 9. Usuários e Permissões
| Item | Status | |
|---|---|---|
| 9.1 "Editar" abre em visualização (Usuários + Perfis) | ✅ **103** | |
| 9.2 Salvar Perfil de Permissão não salva | ✅ **120/121** (front) / 🖥️ **BK-2 validar** | corrida blindada; confirmar persistência no back |
| 9.3 Permissões exibidas ≠ perfil | ✅ **110** (BK-3) | exibe efetivas + nome do perfil no detalhe |
| 9.4 "Perfil de Acesso" × "Perfil de Permissão" | ❓ | `role` × `permissionProfileId` |
| 9.5 Alçada → permissões de Compras (US-2) | 🔗 testar | |
| (DELETE de usuário/perfil) | ✅ **BK-7 entregue** | front já ligado ponta a ponta; endpoints agora existem. Sem patch |

## 10. Compras — Requisições e Produtos/Serviços
| Item | Status | |
|---|---|---|
| Reiniciar/Alterar comprador/ações + histórico (de→para + nomes) | ✅ **99/100/101/102** | |
| Ator das ações via JWT (remoção do `userId` do corpo) | ✅ **111** (BK-C2) | back deriva ator do token; front parou de enviar `userId` |
| 10.1 Ações de Fornecedores | ✅ **119** (flags) / 🔗 validar | flags único/exclusivo/sem subsídio + qtd; fluxo de cotações já funcional no front (validar ponta a ponta) |
| 10.2 Não conclui + Nome do Item manual | 🖥️ **BK-4** + ✅ **118** (nome do item) | 500 é runtime (BK-4); nome do item auto pelo produto |
| 10.3 "Área Requisitante" automática | ✅ **118** (BK-6) | puxa `area` do usuário selecionado |
| 10.4 "Data da Requisição" automática | ✅ **125** | default hoje + readonly |
| 10.5 "Fonte Pagadora" sem opções | 🖥️ **BK-8** + 🔧 | |
| 10.6 Item: Nome/Grupo/Unidade/Valor automáticos | ✅ **118** (BK-6) | puxa do produto (`group/measure/costBase`); validar campos no back |
| 10.7 Vincular contratos | ✅ parcial | single já existe; múltiplos/criação inline pendente |
| 10.8 Ordem financeira + ocultar CC por Projeto | 🔧 + ❓ | |
| 10.9–10.10 Produto × Serviço (tela) | ❓ + 🔧 | renomear/condicionar |
| 10.11–10.13 Grupos/Fabricantes/Unidades | 🖥️ **BK-13** | melhorias |
| 10.14 Botão "+" inline | 🔧 | depende de BK-13 |
| 10.15 Importação em massa | 🖥️ **BK-15** | |
| 10.16 Reorganizar menu de Cadastros | ✅ **128** | removidas abas Fornecedores/CC da tela Compras → Cadastros |
| 10.17 Nomenclatura única | ❓ | |
| 10.18 Campos monetários BR | ✅ **126** | máscara BR em Valor Global + Valor unit. do item |
| 10.19 "Reiniciar Formulário" mal posicionado | ✅ **127** | movido p/ a esquerda; Salvar isolado |

## 11. Design / Consistência
| Item | Status | |
|---|---|---|
| 11.1 Padrão de input (cápsula × retangular) | 🔧 + ❓ | definir com design |
| 11.2 Empty-state / espaço vazio | ✅ **129/131** | padrão global + ícone/CTA em Colaboradores, Stakeholders, Entidade, Corpo Diretivo, Planos de trabalho e Repasses |

## 12. Já conhecidos (não bloqueiam)
| Item | Status | |
|---|---|---|
| Gestor recebe 403 ao aprovar (alçada) | 🖥️ **BK-C1** | front já libera |
| Ator da ação por login (userId) | ✅ **111** (BK-C2 entregue) | back deriva do JWT; front não envia mais `userId` |
| Impostos do fornecedor duplicados | 🖥️ **BK-C3** | unificar |

---

## Cruzamento com o Swagger atualizado (07/08/2026)
Resultado do cruzamento do Swagger novo × demandas BK. Cada BK ✅ **RESOLVIDO** destrava a fila de front à direita.

**P0 (bloqueadores):**
- [x] ✅ **BK-1** — `GET/POST/PATCH/DELETE /v1/positions` (CRUD completo; `CreatePositionDto{name,description}`) → destrava **B1 / §7.1 / §7.3**. **Front a reabrir:** trocar `POSITIONS_FALLBACK` (ids 1–20) por `GET /v1/positions` em Colaboradores e Compras.
- [~] ⚠️ **BK-2** — `UpdatePermissionProfileDto` agora tipado com `permissions[]`. Persistência real só confirma em homologação → manter blindagem de corrida no front (**§9.2**).
- [x] ✅ **BK-3** — `ResponseAllUserDto`/`UserDetailDto` agora expõem `effectivePermissions` + `permissionProfile` → destrava **B4 / §9.3**. **Front a reabrir:** exibir permissões efetivas no detalhe do usuário.
- [ ] ❌ **BK-4** — 500 em `POST /purchases/requests` é runtime; Swagger não confirma. Pendente teste em homologação.
- [~] ⚠️ **BK-5** — `CreatePurchaseRequestDto` ganhou `exclusiveSupplier`, `uniqueSupplier`, `supplierCount`, `withoutSubsidy`. Contrato de cotações ainda a validar em uso (**§10.1**).
- [ ] ❌ **BK-C1** — isenção do Gestor na alçada é runtime; não verificável no Swagger. Front já libera.

**P1 (essenciais):**
- [~] ⚠️ **BK-6** — `products-services GET/{id}` completo; `UserDetailDto` tem `area`. Confirmar `group/measure/costBase` no item (**§10.3/10.6**).
- [x] ✅ **BK-7** — `DELETE /v1/users/{id}` e `DELETE /v1/permission-profiles/{id}` existem. Front a reabrir: ligar botão excluir.
- [ ] ❌ **BK-8** — sem endpoint dedicado de **Fonte Pagadora**; `payingSource` segue string livre (**§10.5**).
- [x] ✅ **BK-9** — `GET /v1/institutional/entities/{id}/history` existe → destrava **§4.5**. **Front a reabrir:** ligar botão "Histórico".
- [ ] ❔ **BK-10** — validação server-side do Código do CC não confirmável no Swagger (front já valida — §2.3 ✅).
- [ ] ❌ **BK-11** — Sintético/Analítico ainda não está em projects/CC (**§2.1**).
- [x] ✅ **BK-12** — `parentId` em `Create/UpdateAccountPlanDto` → confirma **§1.4** (patch-106).
- [x] 🚨 **BK-C2** — action DTOs (`Restart/Cancel/Reject/RequestChanges/MoveStage/ChangeBuyer/SetApprovers`) **NÃO têm mais `userId`**; back deriva ator via JWT. **REGRESSÃO NO FRONT:** patch-100 ainda envia `userId` → passará a falhar. **Front a corrigir com urgência:** remover `resolveActorUserId()` + a injeção de `userId` nas 7 ações de `purchases.service.ts`.
- [ ] ❌ **BK-C3** — duplicação de impostos é decisão de modelagem; não resolvida no Swagger.

**P2 (melhorias):**
- [x] ✅ **BK-16** — `GET /v1/institutional/entities/cnpj/{cnpj}` + `/v1/stakeholders/cnpj/{cnpj}` → `CnpjLookupResponseDto` (Receita Federal). Stakeholder já usa (step1); **Entidade a reabrir**.
- [x] ✅ **BK-18** — `bank` e `bank-accounts` ganharam `/export/excel` → destrava **§6.4**.
- [~] ⚠️ **BK-15** — `stakeholders /import` existe (parcial); demais importações pendentes.
- [~] ⚠️ **BK-17** — `resourceType` no DTO de bank-account (parcial; confirmar Público/Privado).
- [~] ⚠️ **BK-20** — `tax-service/operation-nature` com busca (parcial).
- [ ] ❌ **BK-13** (Grupos/Fabricantes/Unidades ainda strings) · **BK-14** (códigos de imposto) · **BK-19** (matriz/filial).

**Módulos novos no Swagger (ainda não auditados):** Banking (transfers/entries/reconciliation), Accounts Payable, Accounts Receivable, Budgets, Products/Services CRUD, Delivery Locations, Positions.

### Fila de front destravada pelo Swagger novo — TODA ENTREGUE ✅
1. ✅ **BK-C2 — remover `userId` das 7 ações de Compras** — patch **111**.
2. ✅ **BK-1 — Cargo real via `GET /v1/positions`** (Colaboradores) — patch **112/113**.
3. ✅ **BK-3 — permissões efetivas** no detalhe do usuário (§9.3) — patch **110**.
4. ✅ **BK-9 — botão Histórico da Entidade** (§4.5) — patch **114/114b**.
5. ✅ **BK-7 — excluir Usuário/Perfil** — já ligado; endpoint agora existe (sem patch).
6. ✅ **BK-16 — busca CNPJ na Entidade** — patch **115**.
7. ✅ **BK-18 — exportar Banco/Conta Bancária** (§6.4) — patch **116**.

**Parciais desta rodada — ENTREGUES ✅**
- ✅ **BK-6** — auto-preencher item + Área Requisitante (§10.3/10.6) — patch **118**.
- ✅ **BK-5** — flags de fornecedor na requisição (§10.1) — patch **119**. Cotações já funcionais no front.
- ✅ **BK-2** — corrida do re-patch blindada (Perfil + Usuário §9.2) — patches **120/121**. Persistência do PATCH a validar no back.
- ✅ **B2** — criar Centro de Custo inline no Plano de Contas (§1.2) — patch **123**.

**Restante (depende de back/decisão):** BK-4 (500 runtime), BK-8 (Fonte Pagadora), BK-10/11 (Sintético/Analítico), BK-13/14/17/19/20, BK-C1/C3, e decisões de produto (§1.3 Grupo×Tipo, §2.2 semântica do "+").

> Detalhamento de cada BK em **`demandas-backend-consolidado-cliente.md`**.

---

## Pendências de FRONT que NÃO dependem do back (fila sugerida)
1. ~~**Banco — contato duplicado** (§6.2)~~ ✅ **124**
2. ~~**B2** — botão "+" CC inline no Plano de Contas (§1.2)~~ ✅ **123**
3. **Compras (form)** — ~~data automática (§10.4)~~ ✅ **125**, ~~reposicionar "Reiniciar" (§10.19)~~ ✅ **127**, ~~monetário BR (§10.18)~~ ✅ **126**, ~~menu de cadastros (§10.16)~~ ✅ **128**
4. ~~**Design** — empty-state (§11.2)~~ ✅ **129**

**Fila de front puro: ENCERRADA.** O restante depende de **back** (BK-4/8/10/11/13/14/17/19/20, BK-C1/C3) ou **decisão de produto** (§1.3, §2.2, §10.8/10.9/10.10, matriz/filial, §11.1 padrão de input).

_Atualizar este arquivo a cada patch novo e a cada resposta do back (marcar os BK conforme o Swagger for atendendo)._
