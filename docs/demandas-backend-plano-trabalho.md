# Demandas de Backend — Novo Plano de Trabalho (`/v1/work-plans`)

> Lista **priorizada** do que o backend precisa corrigir para o form "Novo Plano de
> Trabalho" funcionar de ponta a ponta. Formato: **endpoint/DTO · limitação atual ·
> alteração sugerida · impacto**.
>
> Prioridades:
> - **P0 — Bloqueante:** sem isso o bloco não persiste / builder não funciona.
> - **P1 — Essencial:** dado é perdido ou desnormalizado (gambiarra JSON-in-string).
> - **P2 — Desejável:** conveniência, cálculo ou fluxo secundário.

---

## P0 — Bloqueantes

### P0.1 · `applicationPlans[]` — reescrever DTO (Itens de despesa)
- **DTO:** `CreateApplicationPlanDto` (`CreateWorkPlanDto.applicationPlans`).
- **Limitação:** campos atuais (`type, description, repass, mandatory, voluntary, total`)
  **não correspondem** à tabela "Itens de despesa" do layout (9 colunas).
- **Alteração sugerida:** substituir por:
  ```
  linkedGoalId?: number        // Meta Vinculada
  linkedStepId?: number         // Etapa Vinculada
  expenseItem: string           // Item de Despesa
  inKindPayment: boolean        // Pagamento em Espécie
  expenseType: string           // Tipo de Despesa
  unit: string                  // Unidade
  quantity: number              // Qtd
  unitValue: number             // Valor Unitário
  totalValue: number            // Valor Total
  ```
- **Impacto:** sem isso, o bloco "Plano de Aplicação Detalhado" **não tem onde salvar**.

### P0.2 · `CreateWorkPlanDto` — campo de persistência dos blocos (layout + blocos livres)
- **Limitação:** o DTO é plano; não guarda **ordem/presença dos blocos** nem o conteúdo
  dos **Blocos Livres** (Texto Livre = rich text; Tabela Livre = colunas/linhas dinâmicas).
- **Alteração sugerida:** adicionar
  ```
  layout: json   // [{ type, order, ...configDoBloco }]  — inclui blocos livres
  ```
  (Alternativa mínima: `freeBlocks: json` + `blockOrder: string[]`.)
- **Impacto:** sem isso, ao reabrir/edit ar/gerar PDF, **a estrutura montada e todo o
  conteúdo livre se perdem**.

### P0.3 · `goals[]` — corrigir tipos e estruturas
- **DTO:** `CreateWorkPlanGoalDto`.
- **Limitações e alterações:**
  - **M1** `quantitativeMeta: boolean` → **`number` ou `string`** (a UI captura uma quantidade, não sim/não).
  - **M2** `executionSteps: string` → **array** `executionSteps: [{ step, place, period, startDate, endDate }]` (a UI é a tabela "Etapas de Execução").
  - **M3** adicionar campo p/ **logotipo** da meta/concessor (URL via `/upload/one-file`), ex.: `logoUrl?: string`.
  - **M4** adicionar vínculo com **OSC(s) Executante(s)/Não Celebrante(s)** listadas no bloco de Metas (ver P1.3/E1).
- **Impacto:** meta quantitativa inutilizável, cronograma de execução sem persistência.

---

## P1 — Essenciais (senão há perda/gambiarra)

### P1.1 · `reimbursements[]` — parcela e meta vinculada
- **DTO:** `CreateReimbursementDto` (`{ monthYear, value }`).
- **Alteração:** adicionar `installment: number` (Parcela) e `linkedGoalId?: number` (Meta Vinculada).
- **Impacto:** o Cronograma de Desembolso perde nº de parcela e vínculo com a meta.

### P1.2 · Monitoramento — array dedicado (ou aceitar JSON-in-string)
- **DTO:** hoje só `monitoringContent: string`.
- **Alteração sugerida:** `monitoringActions: [{ goalOrAction, requiredInfo, collectionProcedure, collectionDate, responsible }]`.
- **Paliativo se recusado:** front serializa a tabela como JSON em `monitoringContent`
  (backend guarda a string intacta) — funciona, mas não é consultável/relatável.

### P1.3 · Equipe de Trabalho — array dedicado (ou aceitar JSON-in-string)
- **DTO:** hoje só `teamWorkContent: string`.
- **Alteração sugerida:** `teamMembers: [{ name, role, miniCv }]`.
- **Paliativo se recusado:** JSON em `teamWorkContent` (mesmo esquema do P1.2).

### P1.4 (E1) · `executada` — permitir múltiplas OSCs executantes
- **DTO:** `executada` é **objeto único**; o bloco de Metas fala em "OSC Executante(s) e
  Não Celebrante(s)" (plural).
- **Alteração:** avaliar `executadas: CreateOSCExecutadaDto[]` (array).
- **Impacto:** se a regra permite N executantes, hoje só cabe 1.
- **⚠️ Confirmar regra de negócio** antes de implementar.

---

## P2 — Desejáveis

### P2.1 (F2) · Totais do Resumo financeiro
- **Limitação:** `Total`, `Total em Bens/Tributos/Obras/Serviços/Outros`, `Total Geral`
  não têm campo.
- **Recomendação:** manter **calculado no front** (agregação do Detalhado por `type`);
  criar campos só se precisarem ser persistidos/auditados.

### P2.2 · Exportar PDF por plano
- **Limitação:** só existe `GET /v1/work-plans/export/excel` (lista). Não há PDF por plano.
- **Alteração:** `GET /v1/work-plans/{id}/pdf` (espelhar `/purchases/requests/{id}/pdf`).
- **Paliativo:** gerar PDF no front a partir do preview (perde fidelidade/servidor).

### P2.3 · Confirmar envelope das listagens
- **Limitação:** `GET /v1/work-plans` e `/dashboard` respondem `200:{}` (não tipado).
- **Ação:** confirmar formato (`{data,count,pages}`?) — necessário p/ paginação correta
  (mesmo problema já detectado em Órgãos).

---

## Itens que resolvemos 100% no frontend (não são demanda de backend)
- Reconstrução do builder (ordem/presença) para **blocos mapeados**, a partir da presença de dados no DTO.
- Cálculo dos totais do Resumo (agregação do Detalhado).
- Auto-preenchimento da OSC Celebrante a partir da entidade/órgão.
- Máscaras, validações, quick-add de Órgão/Instrumento, upload multipart de anexos.
- "Caracterização do interesse recíproco" → `partnershipObject`; "Órgão/entidade responsável" → `grantorId`/`projectId`.
