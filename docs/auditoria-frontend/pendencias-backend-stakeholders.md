# Pendências de Back-end — Módulo Stakeholders

> Documento gerado na auditoria técnica Front × Back × Swagger × regras do cliente.
> Base: `https://homolog.crosoften.com:8045` — tag *Gestão de Cadastro - Stakeholders*.
> Front: Angular 20 (`src/app/features/stakeholders`).

Cada item abaixo **bloqueia ou compromete** o Front. Prioridade sugerida na coluna.

---

## B-02 🔴 ALTA — Falta filtro por `type` na listagem
- **Onde:** `GET /v1/stakeholders`
- **Hoje:** query params = `name, document, personType, status, take, skip`. Não existe `type`.
- **Problema:** o documento do cliente exige duas **"visões"** (Fornecedores × Clientes) e um filtro **Tipo** (Fornecedor/Cliente/Doador/Projeto Apoiado/Outros). Sem `type` no Back, o Front não consegue implementar isso mantendo paginação server-side (filtrar em memória quebra contagem/paginação).
- **Pedido:** adicionar `type` como query param, idealmente aceitando **múltiplos valores** (ex.: `type=Customer,Donor,SupportedProject` para a visão "Clientes").
- **Enum:** `Supplier | Customer | Donor | SupportedProject | Other`.

## B-01 🔴 ALTA — Resposta da listagem sem schema documentado
- **Onde:** `GET /v1/stakeholders`
- **Hoje:** resposta `200` com `description: ""` e **sem body** no Swagger.
- **Problema:** o Front não sabe se recebe um array puro ou envelope `{data,total}` (hoje trata os dois defensivamente).
- **Pedido:** documentar o DTO de resposta com paginação (ex.: `{ data: StakeholderListItem[], total, pages }`), incluindo **quais campos** cada item traz (o Front espera `id, code, personType, document, name, status, type`).

## B-03 🟠 MÉDIA — Resposta de consulta CNPJ sem schema
- **Onde:** `GET /v1/stakeholders/cnpj/{cnpj}`
- **Hoje:** sem schema documentado. O Front **presume** os nomes dos campos (`razaoSocial, nomeFantasia, telefone, naturezaJuridica, atividadePrincipal, atividadeSecundaria, inscricaoEstadual, cep, logradouro, numero, complemento, bairro, municipio, uf, situacao`).
- **Problema:** se o retorno real usar outra estrutura, o **auto-preenchimento do cadastro PJ falha silenciosamente**.
- **Pedido:** publicar o schema real do retorno.

## B-04 🔴 ALTA — Obrigatoriedade dos sub-campos aninhados no PATCH (CONFIRMADO EM PRODUÇÃO)
- **Onde:** `POST /v1/stakeholders` e **`PATCH /v1/stakeholders/{id}`**
- **Hoje:** os arrays estão em `required`, e os sub-DTOs exigem vários campos.
- **Evidência ao vivo (PATCH parcial retornou 400):**
  ```json
  {
    "message": [
      "bankData.0.accountDocument should not be empty",
      "bankData.0.bank should not be empty",
      "bankData.0.agency should not be empty",
      "bankData.0.account should not be empty",
      "bankData.0.accountType must be one of the following values: Checking, Savings, Salary, Payment"
    ],
    "error": "Bad Request", "statusCode": 400
  }
  ```
  Ou seja: ao editar um stakeholder e enviar um item de `bankData` **incompleto**, o Back rejeita exigindo o conjunto inteiro — mesmo sendo um **update parcial**.
- **Precisamos definir:**
  1. Num **PATCH**, os itens aninhados (`addresses/bankData/contacts`) podem ser **parciais/opcionais**? (Hoje não são.)
  2. Os três arrays são obrigatórios no cadastro inicial? Aceitam array vazio (`[]`)? Qual o mínimo (`minItems`)?
  3. Dentro do endereço, `number` e `zipCode` são mesmo obrigatórios?
- **Impacto Front:** o Front já foi ajustado para tratar `bankData` como "bloco completo ou vazio" e validar antes de enviar. Se o Back relaxar a obrigatoriedade no PATCH, poderemos permitir edições realmente parciais.

## B-12 🟠 MÉDIA — `paymentMethod`/`pixType`/`pixKey` acoplados a `bankData` completo
- **Onde:** `CreateStakeholderBankDataDto` (dentro de `bankData[]`).
- **Problema:** a forma de pagamento e os dados de PIX vivem **dentro** de um item de `bankData`, que exige conta bancária completa (documento, banco, agência, conta, tipo). Consequência: **é impossível definir só a forma de pagamento/PIX sem preencher uma conta bancária inteira.**
- **Sintoma observado:** ao editar apenas a "forma de pagamento", o valor não persistia (o Front precisava enviar o bloco `bankData` inteiro, que estava vazio).
- **Pedido:** avaliar **desacoplar** `paymentMethod`/`pixType`/`pixKey` do item de conta bancária (ex.: campos no nível do stakeholder ou um bloco próprio), ou tornar os campos de conta opcionais quando só houver forma de pagamento/PIX.

## B-11 🟡 BAIXA — Dado inválido persistido ("N/A") por falta de validação no cadastro
- **Onde:** endereço do stakeholder (`addresses[].district/city/state`).
- **Contexto:** por causa da obrigatoriedade rígida (B-04), o Front de **criação** preenchia `"N/A"` em bairro/cidade/UF quando vazios, para não tomar 400. Isso gravou dados inválidos (confirmado: registro real com `"district":"N/A","city":"N/A","state":"N/A"`).
- **Correção Front:** em andamento (parar de enviar `"N/A"` e validar como bloco completo).
- **Pedido ao Back:** confirmar a obrigatoriedade real desses campos (ver B-04) para alinharmos a validação e, se possível, **higienizar** os registros já gravados com `"N/A"`.

## B-10 🟠 MÉDIA — Campos de imposto faltantes no contrato do stakeholder
- **Onde:** `CreateStakeholderTaxAndServiceDto` (embutido em `CreateStakeholderDto`/`UpdateStakeholderDto`)
- **Hoje:** a tela coleta, por tributo, **Alíquota + Código**. O contrato só comporta:
  - IRRF, PIS, PCC, COFINS → alíquota **e** código ✅
  - INSS, CSLL, IBS, CBS → **só alíquota** (sem código)
  - ISS → **não existe** (nem alíquota, nem código)
- **Problema:** o usuário preenche **Cód. INSS/CSLL/IBS/CBS** e **Alíquota+Cód. ISS** e esses dados são descartados.
- **Pedido:** adicionar ao contrato: `inssCode, csllCode, issAliquot, issCode, ibsCode, cbsCode`.
- **Obs.:** decisão do cliente foi manter os impostos **embutidos no stakeholder** (não usar `/tax-service` separado).

## B-05 🟠 MÉDIA — Divergência entre os dois DTOs de impostos
- **Onde:** `CreateTaxServiceDto` (endpoint `/v1/tax-service`) × `CreateStakeholderTaxAndServiceDto` (embutido).
- **Problema:** `CreateTaxServiceDto` tem `manualAliquots` e `services[]`; o embutido **não**. Precisamos da fonte da verdade — como os impostos ficam embutidos no stakeholder (ver B-10), o embutido deve ser o contrato completo.

## B-06 🟡 MÉDIA — Sem endpoints de importação em lote + histórico
- **Onde:** módulo Stakeholders (inexistente no Swagger).
- **Requisito do cliente:** "Upload de Arquivo" (planilha modelo) e "Gerenciar Lotes de Upload" (histórico de importações).
- **Pedido — endpoints:**
  | Método | Rota | Descrição |
  |---|---|---|
  | `GET` | `/v1/stakeholders/import/template` | Baixar planilha-modelo (.xlsx) |
  | `POST` | `/v1/stakeholders/import` | Upload `multipart/form-data` (`file`), processa e retorna resumo |
  | `GET` | `/v1/stakeholders/import/batches` | Listar histórico de lotes (paginado) |
  | `GET` | `/v1/stakeholders/import/batches/{id}` | Detalhe do lote + erros por linha |
- **Colunas da planilha (mapeadas ao `CreateStakeholderDto`):**
  - **Obrigatórios:** Tipo (`type`), Pessoa (`personType`), CPF/CNPJ (`document`), Nome/Razão Social (`name`)
  - **Gerais:** Nome Fantasia (`tradeName`), Código (`code`), E-mail (`email`), Telefone (`phone`), Inscrição Estadual (`stateRegistration`), Inscrição Municipal (`municipalRegistration`), Atividade Principal (`mainActivity`), Atividade Secundária (`secondaryActivity`), Natureza Jurídica (`legalNature`)
  - **Endereço (`addresses[0]`):** CEP, Logradouro, Número, Complemento, Bairro, Cidade, UF
  - **Banco (`bankData[0]`):** Banco, Agência, Dígito Ag., Conta, Dígito Conta, Tipo Conta (enum `accountType`), PIX Tipo (enum `pixType`), PIX Chave, Forma Pagamento (enum `paymentMethod`)
  - **Contato (`contacts[0]`):** Nome, E-mail, Telefone, Celular, Cargo
- **Definições necessárias do Back:**
  1. Na importação, `addresses/bankData/contacts` são obrigatórios ou aceita linha só com dados gerais?
  2. Deduplicação por `document`: erro, ignora ou upsert?
  3. Múltiplos endereços/bancos/contatos por stakeholder (várias linhas com mesmo `document`)?
  4. Formatos aceitos: `.xlsx` apenas ou `.csv` também?
  5. Processamento síncrono (resumo na hora) ou assíncrono (fila + status no histórico)?
- **Resposta sugerida (`POST /import`):**
  ```json
  {
    "batchId": 123,
    "fileName": "stakeholders_2026-07.xlsx",
    "total": 50, "success": 47, "failed": 3,
    "errors": [
      { "row": 12, "field": "document", "message": "CNPJ inválido" },
      { "row": 30, "field": "type", "message": "Tipo não reconhecido" }
    ]
  }
  ```

## B-08 🟡 MÉDIA — Endereço de faturamento (exclusivo de clientes) não existe no contrato
- **Onde:** `CreateStakeholderDto` / sub-DTOs.
- **Requisito do cliente:** "No caso dos clientes, haverá ainda um complemento específico: o endereço de faturamento (...) disponível somente para este grupo."
- **Pedido:** criar campo/estrutura para o endereço de faturamento, aplicável apenas quando `type = Customer` (ou grupo de clientes).

## B-07 🟢 BAIXA — Sem parâmetro de ordenação
- **Onde:** `GET /v1/stakeholders`
- **Problema:** não há `orderBy/sort/order`. O Front precisa disso para ordenação por coluna (Código, Nome, Status etc.) coerente com a paginação server-side. Hoje a ordenação client-side só reordena a página visível (enganoso).
- **Pedido:** adicionar `sort` (campo) + `order` (`asc|desc`).

## B-09 🟢 BAIXA — Inconsistência de security scheme (global)
- **Onde:** todas as rotas de stakeholders (e da maior parte do Admin).
- **Problema:** as rotas usam `security: [{ "bearer": [] }]`, mas em `components.securitySchemes` só está declarado `bearerAuth`. Não quebra o Front (o interceptor injeta `Authorization: Bearer`), mas é erro de documentação do Swagger.
- **Pedido:** padronizar o nome do scheme.

---

### Resumo de prioridade
| Prioridade | Itens |
|---|---|
| 🔴 Alta | B-02 (filtro type), B-01 (schema listagem), **B-04 (obrigatoriedade aninhados no PATCH — confirmado)** |
| 🟠 Média | B-03 (schema CNPJ), B-10 (campos imposto), B-05 (DTOs imposto), **B-12 (desacoplar paymentMethod/PIX)** |
| 🟡 Média | B-06 (import lote), B-08 (endereço faturamento), **B-11 (higienizar "N/A")** |
| 🟢 Baixa | B-07 (ordenação), B-09 (security scheme) |

---

### Changelog deste relatório
- **v2** — B-04 promovido para 🔴 Alta com evidência de 400 em produção (PATCH parcial); adicionados **B-11** ("N/A" gravado) e **B-12** (paymentMethod/PIX acoplados a bankData).
- **v1** — versão inicial (B-01 a B-10).
