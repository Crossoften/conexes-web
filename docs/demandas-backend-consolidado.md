# Demandas de Backend — Consolidado (Órgãos · Plano de Trabalho · Parcerias)

> Documento único para o time de backend corrigir **tudo de uma vez**. Princípio adotado:
> **o que dá pra resolver no frontend, resolvemos no frontend** — a lista abaixo é só o
> que **realmente** precisa de mudança no backend.
>
> Módulos: **Órgãos Concessionários** (`/v1/grantors`), **Plano de Trabalho**
> (`/v1/work-plans`), **Repasses e Parcerias** (`/v1/partnerships`).
>
> Prioridades:
> - **P0 — Bloqueante:** sem isso o dado não persiste de forma utilizável.
> - **P1 — Essencial:** dado é perdido, tipo errado, ou só sobrevive como texto opaco.
> - **P2 — Desejável:** conveniência, relatório, ou confirmação de regra de negócio.
>
> Formato: **DTO/endpoint · limitação atual · alteração sugerida · impacto**.

---

## Resumo executivo

| Módulo | P0 | P1 | P2 | Observação |
|---|---|---|---|---|
| Órgãos Concessionários | — | — | 1 | Praticamente tudo resolvido no front. |
| Plano de Trabalho | 1 (F1) | 3 (M1, D1/D2, L1) | 4 | Concentra o trabalho de backend. |
| Repasses e Parcerias | — | — | 3 | DTO já cobre ~90%; resto é confirmação. |

> **Mensagem principal:** o único item **P0** de todo o projeto é a reescrita de
> `applicationPlans` (itens de despesa do Plano de Trabalho). O restante é pequeno ou
> opcional.

---

## Módulo 1 — Órgãos Concessionários (`/v1/grantors`)

### Resolvido no frontend (não é demanda de backend)
- **Paginação:** o front normaliza o envelope `{data,count,pages}` via `toPage()`. Só
  precisamos **confirmar** que a lista responde nesse formato (hoje o Swagger mostra
  `200:{}`).
- **Filtro de status:** o `CreateGrantorDto` não tem `status` e o `findAll` não aceita
  esse filtro. O front **remove** o filtro de status da UI (era decorativo).
- **`staff[]`, `logo`, máscaras:** o front passa a enviar corretamente (upload multipart
  + normalização de CNPJ/CEP/telefone).

### P2.O1 · (Opcional) Ciclo de vida do órgão
- **Limitação:** órgão não tem `status` (Ativo/Inativo).
- **Alteração:** se o negócio exigir ativar/inativar órgão, adicionar `status` ao DTO e
  filtro `status` no `findAll`. Senão, ignorar.

---

## Módulo 2 — Plano de Trabalho (`/v1/work-plans`)

### P0.F1 · `applicationPlans[]` — reescrever DTO (Itens de Despesa) 🔴 **ÚNICO BLOQUEANTE DO PROJETO**
- **DTO:** `CreateApplicationPlanDto`.
- **Limitação:** campos atuais (`type, description, repass, mandatory, voluntary, total`)
  **não correspondem** à tabela "Itens de despesa" (9 colunas).
- **Alteração sugerida:**
  ```
  linkedGoalId?: number     // Meta Vinculada
  linkedStepId?: number     // Etapa Vinculada
  expenseItem: string       // Item de Despesa
  inKindPayment: boolean    // Pagamento em Espécie
  expenseType: string       // Tipo de Despesa
  unit: string              // Unidade
  quantity: number          // Qtd
  unitValue: number         // Valor Unitário
  totalValue: number        // Valor Total
  ```
- **Impacto:** sem isso, o bloco financeiro central não tem onde salvar. (Fallback no
  front seria enfiar JSON em `description` — desnormalizado, não recomendado.)

### P1.M1 · `goals[].quantitativeMeta` — tipo errado
- **Limitação:** é `boolean`; a UI captura uma **quantidade**.
- **Alteração:** `quantitativeMeta: number` (ou `string`).
- **Impacto:** campo "Meta Quantitativa" inutilizável (não há campo alternativo no front).

### P1.D1/D2 · `reimbursements[]` — parcela e meta vinculada
- **DTO:** `CreateReimbursementDto` (`{ monthYear, value }`).
- **Alteração:** adicionar `installment: number` (Parcela) e `linkedGoalId?: number`.
- **Impacto:** Cronograma de Desembolso perde nº de parcela e vínculo de meta.

### P1.L1 · Persistência dos Blocos Livres + ordem dos blocos
- **Limitação:** o DTO não guarda **Texto Livre** (rich text) / **Tabela Livre** (colunas
  dinâmicas) nem a **ordem** customizada dos blocos.
- **Alteração sugerida:** `layout: json` (`[{ type, order, ...config }]`, incluindo blocos livres).
- **Front-first (degradação):** blocos **mapeados** são reconstruídos pela presença de
  dados no DTO (funciona sem backend). **Sem** este campo, os **blocos livres** funcionam
  na sessão/PDF mas **não sobrevivem ao reload**. Aceitável para 1ª versão; recomendado p/ v2.

### Resolvido no frontend (NÃO é demanda de backend)
- **Monitoramento e Avaliação** (tabela) → serializado como JSON em `monitoringContent`.
- **Equipe de Trabalho** (tabela) → serializado como JSON em `teamWorkContent`.
- **Metas → Etapas de Execução** (tabela) → serializado como JSON em `executionSteps` (já é string).
- **Resumo financeiro** (Total, Bens, Tributos, Obras, Serviços, Outros, Total Geral) →
  **calculado** por agregação do Detalhado (read-only).
- **Caracterização do interesse recíproco** → `partnershipObject`.
- **Órgão/entidade responsável** → `grantorId` / `projectId`.

### P2 (desejáveis)
- **P2.M3** Logotipo por meta: adicionar `goals[].logoUrl?` (upload via `/upload/one-file`).
  Front-first: sem o campo, o upload fica só visual.
- **P2.E1** `executada` (objeto único) → avaliar **array** `executadas[]` (o bloco de Metas
  cita "OSC Executante(s)" no plural). **Confirmar regra**; front assume 1 por enquanto.
- **P2.PDF** `GET /v1/work-plans/{id}/pdf` (espelhar `/purchases/requests/{id}/pdf`).
  Front-first: PDF gerado no navegador a partir do preview.
- **P2.LIST** Confirmar envelope de `GET /v1/work-plans` e `/dashboard` (`{data,count,pages}`?).

---

## Módulo 3 — Repasses e Parcerias (`/v1/partnerships`)

O `CreatePartnershipDto` cobre a maior parte do formulário. Mapeamento direto: `concessor`
→`grantorId`, `entidade`→`entityId`, `gestorParceria`→`manager`, datas/números → campos
homônimos, `valor/fonte/conta municipal|estadual|federal` → campos homônimos,
`responsaveis`/`responsaveisFisc` → `responsibles[]` (via `type`), abas de parcelas →
`payables[]`.

### Resolvido no frontend (NÃO é demanda de backend)
- Integração completa (service + list + detail + export) — só falta implementar (é mock hoje).
- Filtros de `status`/`type` da lista → aplicados **client-side** (o `findAll` só aceita `title`).

### P2.PT1 · Anexos 1 e 2 (duplicidade)
- **Limitação:** o form tem **dois** conjuntos de anexo (`dataImpressaoAnexo1/2`,
  `dataLimite1/2`, `tipoValidacao1/2`), mas o DTO tem **um** de cada (`annexPrintDate`,
  `deadlineDate`, `validationType`).
- **Alteração:** se o negócio exige 2+ anexos, transformar em array
  `annexes: [{ printDate, deadlineDate, validationType }]`. Senão, front usa só o 1º.
- **Confirmar regra de negócio.**

### P2.PT2 · Campos sem correspondência no DTO
- **`tipoContratualizacao`** e **`secretaria`** não têm campo no DTO.
- **Alteração:** confirmar se são necessários; se sim, adicionar (`contractingType?`,
  `department?`). Senão, front remove da UI.

### P2.PT3 · (Opcional) Filtro de status na listagem
- **Limitação:** `findAll` só filtra por `title`. O DTO tem `status`, mas a lista não o aceita.
- **Alteração:** adicionar query param `status` ao `findAll` (evita filtrar tudo no client).

---

## Decisões de frontend assumidas (respostas às perguntas em aberto)
1. **Metas** = 1 bloco **repetível** por meta → `goals[]`.
2. **Resumo financeiro** = **calculado read-only** (agregação do Detalhado).
3. **Drag-drop** = **`@angular/cdk`**.
4. **PDF** = **gerado no front** (backend PDF fica como P2 opcional).
5. **Tabelas sem campo dedicado** (Monitoramento, Equipe, Etapas) = **JSON-in-string** nos
   campos livres existentes — sem custo pro backend (guarda a string intacta). Se o backend
   quiser relatórios/consultas sobre esses dados, aí sim vale criar arrays dedicados (P2).
