# Pendências de Back-end — Centro de Custo / Projeto / Atividade

> Front usa `/v1/projects` (cria CC ou Projeto conforme `type`). `/v1/cost-centers` não usado.

- **B-CC-01 🔴** Suporte a **Atividade** (3º nível): falta `projectId` (Atividade → Projeto) e tipo `atividade`.
- **B-CC-02 🔴** Valores canônicos de `type` (`centro_de_custo`/`projeto`/`atividade`) + **migração** de legados. Front corrigido no Patch 08.
- **B-CC-04 🔴** Hierarquia **+ paginação**: hoje o Front monta a árvore client-side por `costCenterId` na página atual (quebra se pai/filhos em páginas diferentes). Pedir hierarquia pronta **ou** paginar por CC-topo. Documentar `{data,total}`.
- **B-CC-07 🟠** `_entityType` **sempre presente e consistente** — usado no update/delete (causa do 404, Patch 11) e para montar a árvore.
- **B-CC-03 🟠** Endpoints duplicados `/v1/cost-centers` × `/v1/projects` — definir canônico.
- **B-CC-05 🟡** "Adicionar Subnível": Projeto sob CC ok (Patch 09); Atividade sob Projeto falta (B-CC-01).
- **B-CC-06 🟡** Cascata CC→Projeto→Atividade em Contas a Pagar/Receber.
- **B-CC-08 🟢** Datas opcionais devem aceitar `null`/omissão (rejeitou `startDate:''`; Front envia null no Patch 10).

### Notas Front
- Modal view-mode tem `input formControlName` fora de `[formGroup]` (corrigir depois).
- Store com duplicação de fetch (refactor A-CC-01).
