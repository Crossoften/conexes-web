# Pendências de Back-end — Módulo Stakeholders

> Documento gerado na auditoria técnica Front × Back × Swagger × regras do cliente.
> Base: `https://homolog.crosoften.com:8045` — tag *Gestão de Cadastro - Stakeholders*.
> Front: Angular 20 (`src/app/features/stakeholders`).

Cada item abaixo **bloqueia ou compromete** o Front. Prioridade sugerida na coluna.
Legenda: 🔴 Alta · 🟠 Média · 🟡 Média-baixa · 🟢 Baixa · ✅ **RESOLVIDO pelo back**.

---

## 🔴🔴 B-13 — `POST /v1/stakeholders` retorna 500 ao cadastrar (BLOQUEANTE — EM PRODUÇÃO)
- **Onde:** `POST /v1/stakeholders` (e provavelmente `PATCH /v1/stakeholders/{id}`).
- **Sintoma ao vivo:** ao salvar um novo stakeholder, o back responde:
  ```json
  { "statusCode": 500, "message": "Internal server error" }
  ```
- **Análise:** é **500 (exceção não tratada no servidor)**, não 400 de validação — ou seja, o payload passou pela validação do DTO e quebrou na **persistência/serviço**. O Front envia o `CreateStakeholderDto` conforme o Swagger atual, incluindo os blocos aninhados (`addresses[]`, `bankData[]`, `contacts[]`, `riskClassification`, `taxesAndServices`).
- **Suspeitos prováveis (campos novos do contrato que o Front passou a enviar):**
  1. **`taxesAndServices`** com os campos de imposto adicionados recentemente — `inssCode`, `csllCode`, `issAliquot`, `issCode`, `ibsCode`, `cbsCode`, `manualAliquots` e `services[]`. Se a **entidade/coluna** no banco (ou o mapeamento do ORM) não foi criada para esses campos, o insert quebra com 500.
  2. **`addresses[]` com 2 itens** (endereço principal + faturamento com `isBilling=true`, exclusivo de clientes). Se a coluna `isBilling` não existe na tabela de endereço, o insert quebra.
  3. Algum campo aninhado chegando `null`/tipo inesperado que o serviço não trata.
- **Pedido ao Back:**
  1. **Verificar o log/stacktrace** do 500 no `create` (é o caminho mais rápido — o erro real está lá).
  2. Confirmar que **migração de banco** acompanha os campos novos do DTO (impostos: `inssCode/csllCode/issAliquot/issCode/ibsCode/cbsCode/manualAliquots/services`; endereço: `isBilling`).
  3. Retornar erro **tratado** (400 com mensagem) em vez de 500 quando o payload for inválido.
- **Impacto:** **cadastro de stakeholder está quebrado em produção.** Bloqueante.
- **Do lado do Front (para triagem):** posso, se ajudar, montar um payload mínimo (só `type/personType/document/name`, sem blocos aninhados) para isolar se o 500 vem dos aninhados novos ou do core — é só pedir.

---

## Abertas (dependem do Back)

### B-04 🔴 ALTA — Obrigatoriedade dos sub-campos aninhados no PATCH (CONFIRMADO EM PRODUÇÃO)
- **Onde:** `POST /v1/stakeholders` e **`PATCH /v1/stakeholders/{id}`**
- **Evidência (PATCH parcial retornou 400):**
  ```json
  { "message": [
      "bankData.0.accountDocument should not be empty",
      "bankData.0.bank should not be empty",
      "bankData.0.agency should not be empty",
      "bankData.0.account should not be empty",
      "bankData.0.accountType must be one of the following values: Checking, Savings, Salary, Payment"
    ], "error": "Bad Request", "statusCode": 400 }
  ```
- **Precisamos definir:** num **PATCH**, os itens aninhados (`addresses/bankData/contacts`) podem ser parciais/opcionais? Os três arrays aceitam `[]`? `number`/`zipCode` do endereço são mesmo obrigatórios?
- **Front hoje:** trata `bankData`/`addresses` como "bloco completo ou vazio" (nunca envia parcial nem `"N/A"`).

### B-12 🟠 MÉDIA — `paymentMethod`/`pixType`/`pixKey` acoplados a `bankData` completo
- **Onde:** `CreateStakeholderBankDataDto` (dentro de `bankData[]`) — `required` ainda inclui conta completa **e** `paymentMethod`.
- **Problema:** impossível definir só forma de pagamento/PIX sem preencher conta bancária inteira.
- **Pedido:** desacoplar `paymentMethod`/`pixType`/`pixKey` do item de conta, ou tornar os campos de conta opcionais quando só houver forma de pagamento/PIX.

### B-11 🟡 — Higienizar dados inválidos ("N/A") gravados
- **Onde:** `addresses[].district/city/state`.
- **Contexto:** cadastros antigos gravaram `"N/A"` por causa da obrigatoriedade rígida (B-04). O Front **já não envia mais** `"N/A"` (valida bloco completo).
- **Pedido:** confirmar a obrigatoriedade real (ver B-04) e, se possível, **higienizar** os registros já gravados com `"N/A"`.

### B-09 🟢 BAIXA — Inconsistência de security scheme (global)
- **Onde:** rotas usam `security: [{ "bearer": [] }]`, mas `components.securitySchemes` só declara `bearerAuth`. Não quebra o Front; é erro de documentação do Swagger. **Pedido:** padronizar o nome.

---

## ✅ Resolvidas pelo Back (Front já consome)

| Item | O que era | Como está agora | Front |
|---|---|---|---|
| **B-01** | Listagem `200` sem schema | `ResponseFindAllStakeholderDto = { data, count, pages }` + `StakeholderListItemDto` (com `tradeName`) | **FE-S1** (patch-68) — envelope `{data,count,pages}`, leitura tolerante |
| **B-02** | Sem filtro `type` na listagem | `GET /v1/stakeholders?type=` aceita **múltiplos** (ex.: `Customer,Donor,SupportedProject`) | **FE-S2** (patch-70) — visões Fornecedores/Clientes + filtro Tipo server-side |
| **B-03** | CNPJ sem schema | `CnpjLookupResponseDto` publicado (`razaoSocial`, `nomeFantasia`, `logradouro…`, `situacaoCadastral`, `atividadePrincipal`) | **FE-S4** (patch-68) — `CnpjData` alinhado; autofill só com os campos reais |
| **B-05 / B-10** | Impostos incompletos no DTO embutido | `CreateStakeholderTaxAndServiceDto` completo: `inssCode`, `csllCode`, `issAliquot/issCode`, `ibsCode`, `cbsCode`, `manualAliquots`, `services[]` | **FE-S5** (patch-69) — model/mapper/modal deixaram de descartar esses campos |
| **B-06** | Sem import em lote | `GET /import/template`, `POST /import`, `GET /import/batches`, `GET /import/batches/{id}` + `ImportBatchSummaryDto`/`ImportErrorDto` | **FE-S7** (patch-72) — modal de importação (modelo, upload, histórico + erros por linha) |
| **B-07** | Sem ordenação | `sort` + `order` (`asc|desc`) na listagem | **FE-S3** (patch-68) — ordenação server-side (deixou de reordenar só a página) |
| **B-08** | Endereço de faturamento inexistente | `CreateStakeholderAddressDto.isBilling` ("exclusivo de clientes") | **FE-S6** (patch-71) — bloco de faturamento no cadastro/edição só para clientes |

> ⚠️ Ver **B-13**: a persistência precisa acompanhar os campos novos de **B-05/B-10** (impostos) e **B-08** (`isBilling`) — o 500 no cadastro pode vir exatamente daí (colunas/migração faltando).

---

### Resumo de prioridade (aberto)
| Prioridade | Itens |
|---|---|
| 🔴 Bloqueante | **B-13 (500 no cadastro)**, B-04 (obrigatoriedade aninhados no PATCH) |
| 🟠 Média | B-12 (desacoplar paymentMethod/PIX) |
| 🟡 Média-baixa | B-11 (higienizar "N/A") |
| 🟢 Baixa | B-09 (security scheme) |

---

### Changelog deste relatório
- **v3** — **B-13 (500 no cadastro)** adicionado como bloqueante, com suspeitos (campos novos de imposto/`isBilling` sem migração). Marcados como ✅ **resolvidos pelo back**: B-01, B-02, B-03, B-05, B-06, B-07, B-08, B-10 (Front atualizado nos patches 68–72, FE-S1..S7). Restam abertos: B-04, B-09, B-11, B-12.
- **v2** — B-04 promovido para 🔴 Alta com evidência de 400 (PATCH parcial); adicionados B-11 ("N/A") e B-12 (paymentMethod/PIX acoplados).
- **v1** — versão inicial (B-01 a B-10).
