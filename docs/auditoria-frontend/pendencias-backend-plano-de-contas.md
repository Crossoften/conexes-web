# Pendências de Back-end — Plano de Contas e Categorias

> `POST/GET /v1/account-plan`, `GET/PATCH/DELETE /{id}`, `GET /export/excel`.

- **B-PC-01 🔴** `findAll` sem filtros/paginação (`status/search/take/skip`) e resposta sem schema.
- **B-PC-02 🔴** Valores canônicos de `categoryType` (Entrada/Saída/Totalizadora) e `accountType` (Sintética/Analítica) + **migração** de legados. Front alinhado no Patch 06.
- **B-PC-03 🟠** Endpoints de "orçamento em lote" (marcar/desmarcar `budgetManagement`).
- **B-PC-04 🟠** Semântica de "Categoria" (= Centro de Custo hoje) e Provisão/Baixa (texto livre × FK a categorias).
- **B-PC-05 🟠** Obrigatoriedade: Swagger só code/title; cliente exige Categoria/Grupo/Tipo/Código/Título (Front alinhado no Patch 07).
- **B-PC-06 🟡** Hierarquia (`parentId` / "Adicionar Conta") — confirmar `children[]`.
