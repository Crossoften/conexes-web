# Conexão 3° Setor — Frontend

Sistema de gestão integrada para o terceiro setor.

## Stack

- **Angular 20** — standalone components, signals, control flow (`@if`, `@for`, `@switch`)
- **NgRx Signals Store** — gerenciamento de estado por feature
- **TypeScript 5.4** — strict mode
- **SCSS** — BEM + CSS custom properties (design tokens)
- **Fontes** — Sora (display) + DM Sans (body), via Google Fonts

---

## Pré-requisitos

- Node.js **18+** (recomendado: 22.x)
- npm **9+**
- Angular CLI **20**

```bash
npm install -g @angular/cli@latest
```

---

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento
npm start
# → http://localhost:4200

# 3. Build de produção
npm run build
```

---

## Adicionar a logo

Coloque o arquivo da logo em:

```
src/assets/images/logo-conexao.png
```

Ela é referenciada automaticamente em:
- `src/app/features/auth/login/login.page.html`
- `src/app/layout/sidebar/sidebar.component.html`

Se a imagem não for encontrada, um SVG de fallback é exibido automaticamente.

---

## Estrutura de pastas

```
src/app/
├── core/                    # Singletons: auth, interceptors
│   ├── auth/
│   │   ├── auth.guard.ts
│   │   └── auth.service.ts  # Mock — trocar por API real
│   └── http/
│       ├── loading.interceptor.ts
│       └── error.interceptor.ts
│
├── layout/                  # Shell, Sidebar, Topbar
│   ├── shell/
│   ├── sidebar/
│   │   ├── nav.config.ts    # ← edite aqui para mudar o menu
│   │   └── sidebar-icon.component.ts
│   └── topbar/
│
├── shared/                  # Componentes reutilizáveis (a implementar)
│   ├── components/
│   │   ├── data-table/
│   │   ├── filter-bar/
│   │   ├── status-badge/
│   │   ├── modal-shell/
│   │   ├── page-header/
│   │   ├── empty-state/
│   │   └── confirm-dialog/
│   ├── directives/
│   ├── pipes/
│   └── utils/
│       └── wizard.controller.ts
│
├── domain/                  # Modelos, enums, mocks
│   ├── models/
│   ├── enums/
│   └── mocks/
│
└── features/                # Módulos de negócio (lazy-loaded)
    ├── auth/                # Login, cadastro, recuperação de senha ✅
    ├── dashboard/           # Placeholder
    ├── registration-management/  # Gestão de cadastros
    │   └── stakeholders/    # Em desenvolvimento
    ├── entities/
    ├── contracts/
    ├── purchasing/
    ├── financial/
    ├── accountability/      # Placeholder
    └── profile/             # Placeholder
```

---

## Login para desenvolvimento

Com dados mockados, qualquer e-mail/senha funciona:

```
E-mail: qualquer@email.com
Senha:  qualquer (mínimo 6 caracteres)
```

---

## Variáveis de design (tokens)

Todos os tokens de cor, espaçamento e tipografia estão em:

```
src/assets/styles/_tokens.scss
```

Principais variáveis:

| Token | Valor |
|---|---|
| `--brand-purple` | `#7C3AED` |
| `--brand-orange` | `#F97316` |
| `--font-display` | `'Sora'` |
| `--font-body` | `'DM Sans'` |
| `--sidebar-width` | `260px` |
| `--topbar-height` | `64px` |

---

## Convenções de código

| Sufixo | Uso |
|---|---|
| `.page.ts` | Componente routable (smart), injeta services/store |
| `.component.ts` | Componente dumb/presentational, usa `@Input()` |
| `.service.ts` | Service singleton (`providedIn: 'root'`) |
| `.store.ts` | NgRx Signals Store por feature |
| `.model.ts` | Interface/type de domínio |
| `.enum.ts` | Enum + config de status |
| `.mock.ts` | Dados mockados para desenvolvimento |
| `.routes.ts` | Arquivo de rotas por feature |

---

## Próximos passos

- [ ] Implementar `DataTableComponent` (shared)
- [ ] Implementar `FilterBarComponent` (shared)
- [ ] Implementar `StatusBadgeComponent` (shared)
- [ ] Implementar `ModalShellComponent` (shared)
- [ ] Implementar tela de listagem de Stakeholders
- [ ] Implementar `StakeholdersStore` (NgRx Signals)
- [ ] Conectar `AuthService` à API real
