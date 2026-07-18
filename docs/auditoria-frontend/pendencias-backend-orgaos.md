# Pendências de Back-end — Cadastrar órgãos (`/v1/grantors`)

> **Módulo:** Contratos e parcerias · **Sub-menu 1:** Cadastrar órgãos (`features/agencies`).
> Cruzamento: doc do cliente ("ÓRGÃO CONCESSOR / SERVIDORES") × Swagger atual × front.
> O back já suporta `status` (DTO + filtro `findAll`), CRUD completo, `staff[]` (obrigatório),
> `managingOrgan`, `tradeName`, `logo`, export/excel.

---

## B-OR-01 🟠 MÉDIA — Portal da Transparência (link por órgão)
O doc do cliente pede a ação 🌐 **Portal da Transparência** (link externo/interno) por órgão.
**Não existe** campo no `CreateGrantorDto`. Adicionar `transparencyUrl?: string`.
- **Front (já aplicado, Patch 31):** o botão 🌐 está **visível** na lista e no modal; abre a URL
  quando o campo existir (hoje inerte). Nada é enviado ao back até o campo existir.

## B-OR-02 🟡 BAIXA — Projeção da lista (`GET /v1/grantors`)
Confirmar que a resposta da listagem inclui **`tradeName`** e **`managingOrgan`** (existem na
entidade; a resposta não é tipada no Swagger). Colunas da UI dependem disso.

## Nota — Desativar × Excluir
O doc do cliente define 🗑 como **Desativar** (status Inactive), **não** exclusão física. O front
(Patch 31) passou a chamar **`PATCH { status: 'Inactive' }`** no 🗑. O `DELETE /v1/grantors/{id}`
continua existindo no back, mas **não é usado pela UI** (regra de negócio: desativar).

---

### Já aplicado no Front (Patch 31, sem depender do Back)
- **Tipo de Servidor** (`staff[].serverType`) virou **select** com os 6 valores do cliente
  (Gestor de Parceria, Comissão de Seleção, Comissão de Monitoramento e Avaliação, Prefeito,
  Responsável Atendimento, Gestor do Órgão) — `serverType` é string no DTO, sem mudança de contrato.
- 🗑 **Desativar** (PATCH status=Inactive) em vez de excluir (lista + modal).
- 🌐 **Portal da Transparência** visível (inerte até B-OR-01).
- Filtro de **status** já existia e está funcional.
