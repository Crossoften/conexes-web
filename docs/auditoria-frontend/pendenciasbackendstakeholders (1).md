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
- **Análise:** é **500 (exceção não tratada no servidor)**, não 400 de validação — ou seja, o payload passou pela validação do DTO e quebrou na **persistência/serviço**.
- **Payload real que reproduz o 500** (resumido — é um **Supplier**, sem blocos de banco/contato):
  ```json
  {
    "type":"Supplier","personType":"PJ",
    "document":"33.054.337/0001-30",
    "name":"CROSOFTEN SOFTWARE E TECNOLOGIA LTDA",
    "email":"mail@mail","standardApportionment":"22222","accountId":null,
    "addresses":[{"zipCode":"04571930","street":"ENG LUIZ CARLOS BERRINI","number":"1140",
      "complement":"ANDAR 7 CONJ 71","district":"CIDADE MONCOES","city":"SAO PAULO","state":"SP","isBilling":false}],
    "bankData":[],"contacts":[],
    "riskClassification":{"privacyEvaluated":true,"privacyEvalDate":null, "...":"..."},
    "taxesAndServices":{"totalRetentions":0,"irfAliquot":0, "...":"..."}
  }
  ```
- **Suspeitos, do mais provável ao menos (com base nesse payload):**
  1. **Documento duplicado (índice único) não tratado.** O `document` é o **CNPJ da própria CROSOFTEN**, muito provavelmente **já cadastrado** no ambiente. Um `INSERT` que viola *unique* e não é capturado vira **500** (deveria ser **409/400** "documento já cadastrado"). → **Back**: capturar a violação e retornar erro tratado.
  2. **Coluna `isBilling` inexistente na tabela de endereços.** O Front envia `addresses[0].isBilling=false` **mesmo em fornecedor**. Se a migração de **B-08** não foi aplicada, todo `create` quebra ao inserir o endereço. → **Back**: aplicar a migração. **Mitigação Front possível**: não enviar `isBilling` em endereço que não é de faturamento (só mandar `isBilling:true` no endereço de faturamento de clientes).
  3. **`document` enviado com máscara** (`33.054.337/0001-30`). O Front deveria mandar **só dígitos** (`33054337000130`) — o lookup de CNPJ já limpa, mas o cadastro não. Além de risco de 500 (parsing/validação no back), gera inconsistência de dado. → **Mitigação Front**: normalizar `document` para dígitos.
  4. **`accountId: null`** — confirmar se o serviço trata nulo (campo opcional). Se tentar `connect`/FK com null/0, quebra. → **Back**: aceitar ausência de conta contábil.
  5. **`email: "mail@mail"`** (sem TLD) — se houver validação de e-mail, seria **400**, não 500; citado só para descartar.
- **Pedido ao Back:**
  1. **Verificar o stacktrace** do 500 no `create` — o erro real está lá (provável `unique constraint`/coluna faltante).
  2. Tratar **documento duplicado** (→ 409/400 com mensagem) e **migração** dos campos novos (`isBilling`; impostos `inssCode/csllCode/issAliquot/issCode/ibsCode/cbsCode/manualAliquots/services`).
  3. Trocar 500 genérico por erro tratado em toda falha de validação/persistência.
- **Impacto:** **cadastro de stakeholder está quebrado em produção.** Bloqueante.
- **Mitigações Front sugeridas (reduzem a superfície do 500, corretas de qualquer forma):** enviar `document` só com dígitos; não enviar `isBilling` em endereço não-faturamento; omitir `accountId` quando não houver conta. Pode ser entregue num patch dedicado se aprovado.

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
