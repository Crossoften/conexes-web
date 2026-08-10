# Análise — Autorização por permissões (para o time de back-end)

> Documento técnico do problema **"permissões não são aplicadas"** relatado pelo cliente:
> um usuário com permissão de **um** módulo consegue **acessar e editar** telas de outros módulos.
> Objetivo: alinhar o modelo de autorização esperado. Base do front: patches 110–152.

---

## 1. O problema (reprodução do cliente)

1. Cria-se um usuário com permissão **somente** ao módulo **Compras**.
2. Loga-se com esse usuário.
3. **Resultado atual:** o usuário navega para telas de **outros módulos** (Entidades, Cadastros, Financeiro…) e **consegue editar/salvar** normalmente.
4. **Esperado:** o acesso e as ações fora das permissões do usuário devem ser **bloqueados**.

## 2. Por que acontece — as duas camadas

Autorização tem **duas** camadas independentes. Hoje **nenhuma** está aplicando.

### 2.1. Back-end — a fronteira de segurança (obrigatória)
O servidor precisa validar, **em cada endpoint**, se o usuário do JWT tem a permissão do **módulo + ação** e **recusar com 403** caso contrário. O teste do cliente (edições concluem com sucesso) indica que **o back está aceitando escritas não autorizadas**.

> **O front nunca pode ser a única trava.** Mesmo com todo o bloqueio visual, um usuário pode chamar a API direto (Postman, console do navegador) e ignorar o front. **Segurança real = enforcement no back.**

### 2.2. Front-end — UX + defesa em profundidade
Esconder/desabilitar o que o usuário não pode ver/fazer. **Depende** de o back expor as permissões efetivas do usuário logado (hoje não expõe — ver §4).

## 3. Modelo de permissões (já existente no cadastro)

O cadastro de usuários/perfis já trabalha com uma **matriz módulo × ação**:

- **6 módulos:** `Gestão de cadastro`, `Entidades`, `Contratos e parcerias`, `Suprimentos/compras`, `Financeiro`, `Prestação de contas`.
- **5 flags por módulo:** `canView`, `canCreate`, `canEdit`, `canDelete`, `isUnlimited`.
- Permissão efetiva do usuário = **perfil de permissão vinculado** (`permissionProfile.permissions`) **+** permissões **diretas** (`modulePermissions`).

O mapeamento **ação HTTP → flag** esperado:

| Ação | Métodos | Flag exigida |
|---|---|---|
| Visualizar/listar | GET | `canView` |
| Criar | POST | `canCreate` |
| Editar | PATCH/PUT | `canEdit` |
| Excluir | DELETE | `canDelete` |

`isUnlimited` = concede todas as ações do módulo.

## 4. O que o back precisa entregar

### BK-26 (P0, segurança) — Enforcement server-side
- Guard/policy de autorização em **todos** os endpoints, associando cada recurso ao seu **módulo** e cada método à sua **ação** (tabela acima).
- Resolver a permissão efetiva do usuário do JWT (perfil + diretas) e **retornar 403** quando faltar a flag.
- Cobrir **leitura e escrita** (não só POST/PATCH/DELETE — GET também, para não vazar dados de módulos sem `canView`).

### BK-27 — `/my-self` com `effectivePermissions`
- Incluir no payload do `/v1/my-self` as **permissões efetivas** do usuário logado, no mesmo formato da matriz (`{ module, canView, canCreate, canEdit, canDelete, isUnlimited }[]`).
- Nome do campo sugerido: `effectivePermissions` (o front já lê `effectivePermissions` **ou** `permissions`, tolerante — patch-152).

## 5. O que o front já fez (patch-152) e o que falta

**Já entregue (modo permissivo):**
- `PermissionService` (`can/canView/canCreate/canEdit/canDelete(module)`), guard de rota por módulo (`canActivateChild`) e **filtro do menu** por `canView`.
- **Modo permissivo automático:** enquanto o `my-self` **não** enviar as permissões, `enforced()` é `false` e **tudo continua liberado** (comportamento idêntico ao atual). Assim que o back entregar **BK-27**, o gating **liga sozinho**, sem novo deploy de lógica.

**Próximo passo do front (incremental, após BK-26/27 no ar):**
- Gating fino dos **botões** de criar/editar/excluir por tela (`canCreate/canEdit/canDelete`).
- Tratamento amigável do **403** de ação (mensagem "sem permissão").

## 6. Resumo

| Item | Responsável | Status |
|---|---|---|
| Enforcement 403 por módulo+ação (todos os endpoints) | **Back** | ❌ **P0 — crítico** |
| `/my-self` expõe `effectivePermissions` | **Back** | ❌ |
| PermissionService + guard + filtro de menu (modo permissivo) | Front | ✅ patch-152 |
| Gating de botões por ação | Front | ⏳ após back |

> **Sem o BK-26, o sistema continua inseguro** — o gating do front é apenas experiência de uso.
