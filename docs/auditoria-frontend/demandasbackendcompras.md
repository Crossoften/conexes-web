# Demandas de Backend — Módulo de Compras (`/v1/purchases`)

> Lista **priorizada** do que o backend precisa ajustar para o módulo de Compras
> aderir 100% ao front. Formato: **endpoint/DTO · limitação atual · alteração
> sugerida · impacto**.
>
> Contexto: o confronto com o Swagger mostrou que **quase todo o fluxo já é atendido
> pela API** (requisições, cotações, adjudicação, pedidos, anexos, histórico,
> aprovadores por alçada). As pendências abaixo são **refinamentos de contrato/dado**
> — nenhuma bloqueia o fluxo principal, mas afetam consistência e estabilidade do front.
>
> Prioridades:
> - **P0 — Bloqueante:** trava o fluxo em produção.
> - **P1 — Essencial:** o front precisa "adivinhar" o shape; risco de quebra quando o back mudar.
> - **P2 — Desejável:** melhora a UX/consistência ou fecha uma lacuna de dado.

---

## P0 — Bloqueantes

### P0.1 · Aprovação — Gestor deve ser isento da alçada por valor _(regressão)_
- **Endpoint:** `POST /v1/purchases/requests/{id}/approve` — resumo do Swagger: *"Se houver aprovadores configurados, segue a cadeia sequencial nível a nível; **senão, cai no fallback por alçada de valor.**"*
- **Sintoma:** um usuário **Gestor** (logado como tal) recebe **403** ao aprovar: `"Usuário não possui alçada de aprovação para o valor desta requisição"`. Ocorre no **fallback por valor**, quando não há aprovadores configurados e o Gestor não tem uma alçada de COMPRAS cobrindo o `estimatedValue`.
- **Regra do cliente (confirmada):** **Gestor/Master/Admin (e ProcurementManager) aprovam qualquer valor, sem depender de alçada.** O front reflete isso (libera o botão Aprovar para o Gestor).
- **Alteração sugerida:** no `approve` (e no `setApprovers`, se aplicável), **isentar da checagem de faixa por valor** os usuários com papel de Gestor — seja pela role global (`Master` / `Admin` / `ProcurementManager`) ou pelo `purchaseRole = Manager`. Ou seja: Gestor aprova mesmo sem alçada e mesmo no caminho de fallback.
- **Impacto:** hoje o Gestor **não consegue aprovar** requisições sem alçada cadastrada → trava a Etapa 2/4. **Bloqueante.**

> Correções de front já aplicadas em torno deste ponto (não dependem do back):
> - o `errorInterceptor` deixou de **expulsar para a home** em 403 de ação (só redireciona em 403 de navegação/GET);
> - as ações de compras agora **mostram a mensagem do back** em toast (antes o erro era silencioso);
> - **FE-4**: o lookup de aprovadores passou a filtrar as alçadas por **`type=COMPRAS`** (as alçadas `FINANCEIRO` não valem para aprovar requisição).

---

## P1 — Essenciais

### P1.1 · Histórico — formato do campo `changes`
- **Endpoint/DTO:** `GET /v1/purchases/requests/{id}/history` → `PurchaseRequestHistoryItemDto.changes` (tipado como `object` genérico).
- **Limitação:** o contrato não define o shape de `changes`. No seed observamos `{ "status": "Rejected" }` — o que **parece um diff campo-a-campo**, mas não há garantia. Se em ações reais (update/move/aprovação) o back enviar o **snapshot completo** da requisição, a timeline do histórico fica poluída (dezenas de campos) e o front não consegue montar "campo → de/para".
- **Alteração sugerida:** padronizar `changes` como **diff explícito**, por exemplo:
  ```
  changes: Array<{ field: string; from: unknown; to: unknown }>
  ```
  ou, no mínimo, documentar formalmente o objeto atual (chaves e semântica) no Swagger.
- **Impacto:** o front já renderiza pares "rótulo: valor"; com o diff padronizado dá para mostrar "de → para" corretamente. **Médio.**

### P1.2 · Respostas de listagem/detalhe não tipadas (`200: {}`)
- **Endpoints:** `GET /requests/stage/{stage}`, `GET /requests/{id}`, `GET /orders`, `GET /orders/{id}`, `GET /quotations/request/{id}` — todos com `responses.200` **sem schema** no Swagger.
- **Limitação:** o front infere os campos (`PurchaseRequest`, `PurchaseOrder`, `PurchaseQuotation`) e os marca como opcionais. Qualquer renomeação/remoção no back quebra silenciosamente a tela (campo vira `—`/`N/A`).
- **Alteração sugerida:** tipar as respostas no Swagger (Response DTOs), inclusive as relações expandidas (`costCenter`, `project`, `supplier`, `items`, `requester`, `buyer`).
- **Impacto:** estabilidade do contrato; hoje é a maior fonte de risco do módulo. **Médio/Alto.**

### P1.3 · Pedido de Compra — enum de `status`
- **Endpoint/DTO:** `GET /orders` → `PurchaseOrder.status` (string livre).
- **Limitação:** não há enum documentado para o status do pedido; o front mapeia rótulos "por adivinhação" (Pending/Sent/Completed/Received/Cancelled) com fallback para o valor cru.
- **Alteração sugerida:** documentar o enum de status do pedido (valores canônicos).
- **Impacto:** badge/label corretos e filtros confiáveis na tela de Pedidos. **Baixo/Médio.**

---

## P2 — Desejáveis

### P2.1 · "Grupo" na listagem de requisições
- **Contexto:** a UI de listagem (Cotações e Gerenciamento) tinha uma coluna **"Grupo"** sem fonte de dado — o `CreatePurchaseRequestDto` **não tem campo de grupo no nível da requisição** (só `items[].group`).
- **Situação atual no front:** a coluna foi **removida** (não havia o que exibir).
- **Alteração sugerida (se a coluna for requisito):** definir um "grupo/categoria" no nível da requisição (ex.: derivar do `accountPlan`/plano de contas, ou expor o grupo predominante dos itens na listagem).
- **Impacto:** só relevante se o cliente exigir a coluna de volta. **Baixo.**

### P2.2 · Exportação em lote das listagens
- **Contexto:** as telas tinham botões "Exportar" de lista sem endpoint correspondente (removidos). Só existe exportação **por requisição** (`/excel`, `/pdf`).
- **Alteração sugerida (se necessário):** endpoint de exportação de listagem (Excel/CSV) com os mesmos filtros da tela.
- **Impacto:** conveniência de relatório. **Baixo.**

---

## Itens confirmados no teste real (não são pendência de back)

- **`costCenter` vindo `null`** na listagem: **não é bug de front** — o endpoint já expande a relação; o registro de seed simplesmente não tem centro de custo. Requisições com centro de custo preenchido exibem normalmente.
- **Histórico** (`/requests/{id}/history`): endpoint **funcional**, retorna array de eventos; o front carrega e renderiza (ação traduzida + data/hora + `changes`). Pendência remanescente é só o **formato do `changes`** (P1.1).
- **Aprovadores por alçada** (`/v1/approval-limits` + `PATCH /requests/{id}/approvers`): o back **já valida** a alçada de cada nível; o front agora filtra os selects por `RequestSupervisor` × nível × faixa (`minValue..maxValue` vs `estimatedValue`) — apenas UX/consistência.
- **Anexos** (`/requests/{id}/files`): `AttachFileDto` de compras usa **só `fileUrl` + `fileKey`** (sem `description`, diferente de parcerias) — o front respeita isso.

---

_Documento gerado no fechamento da revisão do módulo de Compras. Atualizar conforme os testes de homologação levantarem novos pontos (especialmente P1.1 e P1.2, que dependem de rodar ações reais de update/aprovação/pedido)._
