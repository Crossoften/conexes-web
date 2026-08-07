# Roteiro de Testes — Ajustes Entregues

> Guia para **revalidar em homologação** os pontos do "Consolidado de Pontos de Ajuste (04/08/2026)"
> que já foram corrigidos. Marque ✅/❌ em cada item. Onde houver dependência do back-end, está sinalizado
> **(requer back)** — nesses, confirme antes com o time se o ambiente já está atualizado.

Legenda: **☐** a testar · **(requer back)** depende de ajuste do servidor já solicitado.

---

## 1. Plano de Contas

- ☐ **Título da tela** — deve estar "Cadastro de Plano de Contas" (sem "e Categorias").
- ☐ **Rótulo do campo** — o campo de categoria deve se chamar **"Centro de Custo, Projeto ou Atividade"**.
- ☐ **Modal de edição** — o cabeçalho deve mostrar **código _e_ título** da conta (ex.: "1.1 — Caixa"), não só o número.
- ☐ **Conta superior (subconta)** — no cadastro/edição, há o campo **"Conta superior"** listando contas Totalizadora/Sintética; salvar vincula corretamente. **(requer back — `parentId`)**
- ☐ **Cancelar** — abrindo a conta direto em edição (botão Editar da lista), "Cancelar" **fecha/volta** à listagem.
- ☐ **Criar Centro de Custo inline (novo)** — no cadastro **e** na edição de conta, o botão **"+"** ao lado de "Centro de Custo…" abre um modal **completo** de Centro de Custo; ao salvar, o CC criado **já aparece selecionado** no campo, sem sair da tela.

## 2. Centro de Custo / Projeto

- ☐ **Código** — o campo "Código" aceita **apenas números e ponto** (ex.: 1.1.2); letras/símbolos são bloqueados.

## 3. Impostos e Retenções

- ☐ **Alíquota com vírgula** — todos os campos de alíquota aceitam **vírgula** (ex.: 1,5), inclusive **ISS**.
- ☐ **Total inclui ISS** — o total considera o ISS.

## 4. Cadastro de Entidade

- ☐ **Máscara de CNPJ** — o CNPJ é formatado automaticamente (00.000.000/0001-00).
- ☐ **Máscara de telefone** — telefone principal e celular são formatados.
- ☐ **Buscar na Receita pelo CNPJ** — ao digitar um CNPJ válido e sair do campo, os dados (Razão Social, Nome Fantasia, endereço, telefone, e-mail) **preenchem automaticamente**. **(requer back — consulta CNPJ)**
- ☐ **Histórico** — o botão **"Histórico"** abre um modal com a linha do tempo de alterações (ação, data, autor, campo: valor anterior → novo). **(requer back — endpoint de histórico)**

## 5. Stakeholders (Fornecedores)

- ☐ **Conta contábil** — é um **select do Plano de Contas** mostrando **código — nome** (não só o número), e aparece corretamente após salvar.
- ☐ **Múltiplos serviços** — é possível **adicionar vários serviços** ao fornecedor (lista com adicionar/remover), não só um.
- ☐ **Editar serviço** — ao reabrir, os serviços cadastrados persistem.
- ☐ **Salvar Rascunho** — exibe **confirmação** (mensagem "Rascunho salvo.").

## 6. Conta Bancária e Bancos

- ☐ **Fonte pagadora / Código opcionais** — dá para salvar sem preencher esses campos.
- ☐ **Contato sem duplicidade** — no cadastro novo **não** há mais os campos duplicados "Telefone Contato" e "Celular Contato".
- ☐ **Exportar** — na tela de Contas Bancárias, o botão **"Exportar"** baixa a planilha da aba ativa (Contas ou Bancos). **(requer back — export/excel)**

## 7. Colaboradores e Dirigentes

- ☐ **Cargo real (fim do "Cargo ID 5")** — o campo **Cargo** lista os cargos reais do sistema; salvar um colaborador **não** dá mais erro de "Cargo não encontrado". **(requer back — catálogo `/v1/positions` populado)**
- ☐ **Coluna "Cargo" na listagem** — após cadastrar/editar, o cargo aparece preenchido na lista.
- ☐ **Aba renomeada** — a aba antes chamada "Configurações de Parâmetros" agora é **"Dados do colaborador"**.
- ☐ **Vínculo (select)** — "Vínculo" é um **select** (Prestador PJ, Prestador PF, CLT, Voluntariado, Estágio).
- ☐ **CNS opcional** — o "Cartão Nacional de Saúde" **não** é obrigatório.
- ☐ **Salário com máscara** — o salário é formatado em R$ (0.000,00).
- ☐ **Empty-state** — sem registros, a tela mostra ícone + mensagem + botão **"Cadastrar colaborador"** (centralizado).

## 8. Corpo Diretivo / Conselho Fiscal

- ☐ **Editar abre em edição** — o botão "Editar" abre direto em modo edição (sem 2º clique).
- ☐ **Integrantes** — dá para **adicionar/remover** integrantes na edição.
- ☐ **Status padronizado** — o badge de status (Ativo/etc.) tem o **mesmo visual** das demais telas (ex.: Colaboradores).
- ☐ **Empty-state** — sem registros, mostra ícone + botão "Cadastrar corpo diretivo".

## 9. Usuários e Permissões

- ☐ **Editar abre em edição** — Usuários e Perfis abrem direto em edição pelo botão Editar.
- ☐ **Permissões efetivas** — no detalhe do usuário, a aba "Permissões" mostra as permissões **efetivas** (do perfil vinculado + diretas) e o **nome do perfil**. **(requer back — permissões efetivas)**
- ☐ **Salvar Perfil de Permissão** — editar as permissões de um perfil e salvar **persiste** (marcações não se perdem ao reabrir). **(requer back — persistência do PATCH)**
- ☐ **Excluir** — excluir usuário/perfil funciona e some da lista. **(requer back — DELETE)**

## 10. Compras — Requisição

- ☐ **Ações via ator do login** — Rejeitar / Solicitar ajustes / Cancelar / Reiniciar / Mover etapa / Trocar comprador / Definir aprovadores funcionam sem erro. **(requer back — ator via JWT)**
- ☐ **Área Requisitante automática** — ao escolher o requisitante, a "Área" preenche sozinha. **(requer back — usuário com `area`)**
- ☐ **Item automático** — ao escolher um Produto/Serviço, **Nome/Grupo/Unidade/Valor** do item preenchem. **(requer back — produto com `group/measure/costBase`)**
- ☐ **Data da Requisição automática** — vem com a data de hoje e é **somente leitura**.
- ☐ **Valores em padrão BR** — "Valor Global Estimado" e "Valor unit." formatam como 1.234,56.
- ☐ **Flags de fornecedor** — há checkboxes separados **Fornecedor único / Fornecedor exclusivo / Sem subsídio** + Qtd. de fornecedores; persistem ao salvar/reabrir. **(requer back — validar cotações)**
- ☐ **"Reiniciar" reposicionado** — o botão "Reiniciar formulário" fica à **esquerda** (junto de "Voltar"), longe de "Salvar".
- ☐ **Conclusão da requisição** — salvar a requisição conclui sem erro interno. **(requer back — causa do 500)**

## 10b. Compras — Cadastros

- ☐ **Menu de Cadastros** — a tela **Compras → Cadastros** mostra apenas **"Produtos serviços"** e **"Locais de entrega"** (sem as abas Fornecedores/Centro de custo).

## 11. Geral / Design

- ☐ **Empty-states consistentes** — as listagens sem registros (Colaboradores, Stakeholders, Entidade, Corpo Diretivo, Planos de trabalho, Repasses) mostram ícone + mensagem + botão de cadastro, centralizado.
- ☐ **"Editar" em 1 clique** — em todos os módulos, o botão Editar abre direto em edição.

---

## Itens que dependem do back-end (aguardando o time)

Estes ainda **não** entram no teste até o back confirmar (ver `demandas-backend-atualizado.md`):

- **Conclusão da requisição** (causa do erro 500) — **P0**.
- **Persistência real do Perfil de Permissão** — **P0**.
- **403 do Gestor ao aprovar** (isenção de alçada) — **P0**.
- Select de **Fonte Pagadora**; **Sintético/Analítico**; catálogos de **Grupos/Fabricantes/Unidades** e **códigos de imposto**; **importações**; **tipo de recurso** no banco; **matriz/filial**; **reaproveitar serviços**.

## Decisões de produto pendentes (não são bugs)

- "Grupo da Categoria" × "Tipo" (§1.3); Sintético/Analítico como conceito (§2.1); semântica do "+" em CC (§2.2).
- "Perfil de Acesso" × "Perfil de Permissão" (§9.4); nomenclatura única (§10.17).
- Telas separadas Produto × Serviço (§10.9/10.10); ordem financeira CC→Projeto→Categoria (§10.8).
- Padrão oficial de input cápsula × retangular (§11.1); matriz/filial (§4.6).

---

_Base: patches de front **110–131** sobre `8941b688`. Itens **(requer back)** só passam quando o ambiente de homologação estiver com o back atualizado._
