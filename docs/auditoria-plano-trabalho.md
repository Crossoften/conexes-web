# Auditoria — Novo Plano de Trabalho (`/v1/work-plans`)

> Confronto **bloco a bloco** entre o layout builder ("Novo Plano de Trabalho") e o
> contrato atual do Swagger (`CreateWorkPlanDto` e sub-DTOs). Para cada lacuna,
> indica-se **o que é resolvível no frontend** (paliativo) e **o que exige backend**.
>
> Legenda de cobertura:
> - 🟢 **Coberto** — campo existe no DTO e casa com a UI.
> - 🟡 **Parcial / paliável no front** — não há campo dedicado, mas dá pra persistir
>   serializando em campo string livre existente, ou calcular no front.
> - 🔴 **Sem suporte** — não há onde persistir; **exige alteração de backend**.

## 1. Visão geral do mecanismo (builder)

O form é um **construtor de blocos** (paleta/índice à esquerda, canvas à direita, blocos
com arrastar/remover). Isso introduz **duas necessidades que o DTO plano não modela**:

1. **Ordem e presença dos blocos** (qual bloco entrou, em que ordem) — para reproduzir
   no *Pré-visualizar* e no *PDF*.
2. **Blocos livres** (Texto Livre, Tabela Livre) — conteúdo arbitrário, repetível.

> **Estratégia de reconstrução no front (sem backend):** para os blocos *mapeados*, o
> builder pode ser reconstruído na edição a partir da presença de dados no DTO (ex.: se
> `goals[]` tem itens, mostra o bloco Metas). Isso cobre ordem/presença dos blocos fixos.
> **Não cobre** os blocos livres nem uma ordem customizada — para isso, ver 🔴 L1.

## 2. Cobertura por bloco

### Bloco fixo (cabeçalho)
| Campo UI | DTO | Status |
|---|---|---|
| Título do plano* | `title` | 🟢 |
| Instituição / Órgão* (lookup `/v1/grantors` + quick-add) | `grantorId` | 🟢 |
| Tipo de Instrumento* (+ quick-add) | `instrumentType` | 🟢 |

### [Institucional] Dados do Programa — Único
| Campo UI | DTO | Status |
|---|---|---|
| Nro do programa* | `programNumber` | 🟢 |
| Tipo de instrumento* | `instrumentType` | 🟢 (duplica header — usar mesma fonte) |
| Orgão/entidade responsável* | — | 🟡 sem campo próprio; mapear p/ `grantorId`/`projectId` ou serializar |

### [Institucional] Dados e Informações da OSC Celebrante — Único
Auto-preenchimento a partir da entidade/órgão selecionado.
| Campo UI | DTO (`celebrante`) | Status |
|---|---|---|
| Nome* / CNPJ* | `name` / `cnpj` | 🟢 |
| CEP* / Endereço* / Nro* / Complemento | `zipCode` / `address` / `number` / `complement` | 🟢 |
| Locais de atuação* | `actionLocations` | 🟢 |
| Site* | `site` | 🟢 |
| Nome representante* / Cargo | `repName` / `repJobTitle` | 🟢 |
| RG* / Orgão expedidor* / CPF* | `repRg` / `repExpOrgan` / `repCpf` | 🟢 |
| Caracterização do interesse recíproco (textarea) | — | 🟡 mapear p/ `partnershipObject` (livre) |

### [Institucional] Responsável por Acompanhar a Parceria — Único
| Campo UI | DTO (`responsible`) | Status |
|---|---|---|
| Responsável* / Função na parceria* | `name` / `function` | 🟢 |
| RG* / Orgão expedidor* / CPF* | `rg` / `expOrgan` / `cpf` | 🟢 |
| Telefone* / Email* | `phone` / `email` | 🟢 |

### [Institucional] Dados da OSC Executante e Não Celebrante
| Campo UI | DTO (`executada`) | Status |
|---|---|---|
| Nome da OSC* / CNPJ | `name` / `cnpj` | 🟢 (obs: DTO exige `cnpj`; UI não marca `*`) |
| CEP* / Endereço* / Nro* / Complemento | `zipCode` / `address` / `number` / `complement` | 🟢 |
| Nome representante* / Cargo / RG* / Orgão exp.* / CPF* | `rep*` | 🟢 |
| **Múltiplas OSCs executantes** (bloco Metas cita "Adicionar OSC Executante(s)…" no plural) | `executada` é **objeto único** | 🔴 E1 — se a regra é N executantes, precisa virar array |

### [Plano de Trabalho] Dados do Plano de Trabalho
| Campo UI | DTO | Status |
|---|---|---|
| Nro da proposta* | `proposalNumber` | 🟢 |
| Objeto | `object` | 🟢 |
| Objetivos Específicos* | `specificObjects` | 🟢 |
| Local de Execução* | `executionLocation` | 🟢 |
| Descrição da Realidade Objeto da Parceria* | `realityDescription` | 🟢 |
| Público-alvo* | `targetAudience` | 🟢 |
| Descrição da Atividade/Projeto* | `activityDescription` | 🟢 |
| Data de Início* / Término* | `startDate` / `endDate` | 🟢 |
| Valor de Repasse* | `repassValue` | 🟢 (fonte única com Resumo) |
| Contrapartida* | `mandatoryCounterpart` (+`voluntaryCounterpart`?) | 🟡 ambíguo — 1 campo UI x 2 no DTO |
| Valor Global* | `globalValue` | 🟢 |

### [Plano de Trabalho] Metas, Indicadores e Cronograma de Execução → `goals[]`
| Campo UI | DTO (`goals[]`) | Status |
|---|---|---|
| Resultado esperado* | `expectedResult` | 🟢 |
| Indicador* | `indicator` | 🟢 |
| Meios de Verificação* | `verificationMeans` | 🟢 |
| Meta Quantitativa* (quantidade) | `quantitativeMeta` (**boolean**) | 🔴 M1 — tipo errado (deveria ser number/string) |
| Atuação em rede? Sim/Não | `networkAction` (boolean) | 🟢 |
| **Etapas de Execução** (tabela: Etapa/Local/Período/Início/Término) | `executionSteps` (**string**) | 🔴 M2 — deveria ser array de etapas |
| "Alterar Logotipo do concessor" (upload) | — | 🔴 M3 — sem campo (usar `/upload/one-file` + campo p/ URL) |
| "Adicionar OSC Executante(s) e Não Celebrante(s)" + Nome da OSC | — | 🔴 M4 — sem campo (relaciona com E1) |

### [Financeiro] Plano de Aplicação Detalhado — Único → `applicationPlans[]`
Tabela "Itens de despesa" — **9 colunas**:
`Meta Vinculada | Etapa Vinculada | Item de Despesa | Pagamento em Espécie | Tipo de Despesa | Unidade | Qtd | Valor Unitário | Valor Total`
| DTO atual (`CreateApplicationPlanDto`) | `type(enum) · description · repass · mandatory · voluntary · total` |
|---|---|
| **Status** | 🔴 **F1 — mismatch total.** Nenhuma coluna da UI casa com o DTO. Bloco inteiro fica sem persistência. **Reescrever o DTO.** |

### [Financeiro] Plano de Aplicação – Resumo — Único
| Campo UI | DTO | Status |
|---|---|---|
| Repasse* | `repassValue` | 🟢 |
| Contrapartida Obrigatória / Voluntária | `mandatoryCounterpart` / `voluntaryCounterpart` | 🟢 |
| Total em Despesas Administrativas | `adminExpensesValue` | 🟢 |
| Total Geral* | `globalValue` | 🟢 |
| Total* / Total em Bens / Tributos / Obras / Serviços / Outros | — | 🟡 **calculáveis no front** (agregação do Detalhado por `type`); se precisam persistir → 🔴 F2 |

### [Financeiro] Cronograma de Desembolso — Único → `reimbursements[]`
Tabela "Parcelas": `Parcela | Data | Valor | Meta Vinculada`
| Campo UI | DTO (`reimbursements[]`) | Status |
|---|---|---|
| Data | `monthYear` | 🟢 |
| Valor | `value` | 🟢 |
| **Parcela** (nº) | — | 🔴 D1 — falta `installment` |
| **Meta Vinculada** | — | 🔴 D2 — falta `linkedGoalId` |

### [Equipe e Monitoramento] Equipe de Trabalho — Único
Tabela "Membros da Equipe": `Nome | Atribuição | Mini currículo`
| DTO atual | `teamWorkContent` (**string**) |
|---|---|
| **Status** | 🟡 **paliável** — serializar a tabela como JSON em `teamWorkContent`. Backend guarda/retorna a string intacta. Ideal: array dedicado (T1). |

### [Equipe e Monitoramento] Monitoramento e Avaliação — Único
Tabela "Ações de Monitoramento": `Ação ou Meta | Informações Necessárias | Procedimento de Coleta | Data de Coleta | Responsável`
| DTO atual | `monitoringContent` (**string**) |
|---|---|
| **Status** | 🟡 **paliável** — serializar JSON em `monitoringContent`. Ideal: array dedicado (T2). |

### [Blocos Livres] Texto Livre / Tabela Livre — repetíveis
- **Texto Livre**: Título da Seção* + Conteúdo (**rich text**: listas, B/I/U/S).
- **Tabela Livre**: Título da tabela* + colunas dinâmicas (add/remove) + linhas.
| DTO atual | — (nenhum campo) |
|---|---|
| **Status** | 🔴 **L1 — sem persistência.** Não há campo para conteúdo livre nem para a ordem dos blocos. **Exige campo backend** (ex.: `layout`/`blocks` JSON). |

## 3. Campos do DTO sem representação na UI
- `status` (`Draft|AwaitingApproval|Active|Completed|Cancelled`) — definido programaticamente (Salvar ⇒ `Draft`; fluxo de aprovação depois). OK.
- `projectId` — sem campo visível; candidato a receber "Orgão/entidade responsável" ou ser omitido.
- `partnershipObject` — candidato a receber "Caracterização do interesse recíproco".

## 4. Resumo — o que dá pra fazer só no front (paliativo)
| Item | Paliativo no front | Observação |
|---|---|---|
| Monitoramento (tabela) | JSON em `monitoringContent` | transparente p/ backend |
| Equipe de Trabalho (tabela) | JSON em `teamWorkContent` | transparente p/ backend |
| Resumo financeiro (totais extras) | calcular por agregação do Detalhado | read-only; não persiste |
| Ordem/presença de blocos **mapeados** | reconstruir do DTO na edição | funciona sem backend |
| Caracterização do interesse recíproco | usar `partnershipObject` | reaproveita campo livre |
| Órgão/entidade responsável | `grantorId`/`projectId` | reaproveita |

## 5. O que **não** dá pra fazer no front (exige backend) — ver `demandas-backend-plano-trabalho.md`
- **F1** Reescrever `applicationPlans` (itens de despesa detalhados).
- **L1** Campo de persistência p/ blocos livres + ordem dos blocos.
- **M1/M2/M3/M4** Ajustes em `goals` (tipo da meta, etapas como array, logo, OSCs).
- **D1/D2** `reimbursements` com parcela + meta vinculada.
- **E1** `executada` como array (múltiplas OSCs) — se a regra exigir.
- **T1/T2** (opcional) arrays dedicados p/ Equipe e Monitoramento — senão, paliativo JSON-in-string.
- **F2** Campos de totais do Resumo — se precisarem persistir.
- **PDF** endpoint de exportação por plano (só existe `/export/excel`).
