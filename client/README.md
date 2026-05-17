# Growth Ads — Frontend

Interface React para visualização e gerenciamento de dados de performance do **Meta Ads**, com dashboard analítico, Kanban de tarefas, alertas e integração WhatsApp.

---

## Tecnologias

- **Framework:** React 19 + TypeScript
- **Build:** Vite 8
- **Estilo:** Tailwind CSS 4 (dark theme)
- **Gráficos:** Recharts
- **Drag-and-Drop:** @dnd-kit (Kanban)
- **Formulários:** React Hook Form + Zod
- **HTTP:** Axios
- **Rotas:** React Router v7
- **Ícones:** Lucide React

---

## Setup

```bash
cd client
npm install
npm run dev
```

O front roda na porta `5173` por padrão e espera a API em `http://localhost:3001/api`.

### Variável de ambiente (build-time)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITE_API_URL` | URL base da API | `http://localhost:3001/api` |

> `VITE_API_URL` é injetada no build. Para alterar em produção, é preciso recompilar.

---

## Estrutura

```
client/
├── src/
│   ├── components/
│   │   ├── ui/               # Componentes genéricos reutilizáveis
│   │   │   └── Message.tsx   # Toast de feedback (sucesso/erro)
│   │   ├── AlertDropdown.tsx # Dropdown de alertas no navbar
│   │   ├── BudgetCard.tsx    # Card de orçamento mensal do cliente
│   │   ├── ClientCard.tsx    # Card de cliente com ações (sync, token, editar, excluir)
│   │   ├── ClientForm.tsx    # Formulário de cadastro de cliente
│   │   ├── DatePicker.tsx    # Seletor de data customizado
│   │   ├── GoalCard.tsx      # Card de meta por métrica
│   │   ├── HelpTooltip.tsx   # Tooltip de ajuda reutilizável (ícone "?")
│   │   ├── Layout.tsx        # Layout principal com nav responsiva (hamburger menu)
│   │   ├── ProtectedRoute.tsx # Guarda de rota autenticada
│   │   ├── SyncForm.tsx      # Formulário de sincronização manual
│   │   ├── SyncProgressModal.tsx # Modal com logs SSE de sync em tempo real
│   │   ├── TaskBoard.tsx     # Board Kanban com 5 colunas
│   │   ├── TaskCard.tsx      # Card de tarefa individual
│   │   ├── TaskColumn.tsx    # Coluna do Kanban
│   │   └── TaskForm.tsx      # Modal de criação/edição de tarefa
│   ├── contexts/
│   │   └── AuthContext.tsx    # Contexto de autenticação (login, logout, refresh, user)
│   ├── lib/
│   │   └── api.ts            # Instância Axios + tipos + API functions
│   ├── pages/
│   │   ├── Dashboard.tsx     # Dashboard com gráficos, métricas, ranking e filtros
│   │   ├── Clients.tsx       # Listagem e gerenciamento de clientes
│   │   ├── Tasks.tsx         # Kanban de tarefas com filtros
│   │   ├── Settings.tsx      # Configurações (token global, auto-sync, WhatsApp)
│   │   ├── Managers.tsx      # Gestão de gestores (admin)
│   │   ├── Invites.tsx       # Gestão de convites (admin)
│   │   ├── Login.tsx         # Tela de login
│   │   └── Register.tsx      # Cadastro via convite
│   ├── App.tsx               # Rotas e providers
│   ├── main.tsx              # Entry point
│   └── index.css             # Tailwind directives + estilos globais
├── nginx.conf                # SPA routing para produção
├── Dockerfile.client         # Build multi-stage (Vite + Nginx)
└── package.json
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server com HMR (porta 5173) |
| `npm run build` | TypeScript check + build de produção (`dist/`) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview do build de produção |

---

## Rotas

| Rota | Página | Auth | Admin |
|------|--------|------|-------|
| `/login` | Login | Não | Não |
| `/register/:token` | Cadastro via convite | Não | Não |
| `/` | Dashboard | Sim | Não |
| `/clients` | Clientes | Sim | Não |
| `/tasks` | Kanban de Tarefas | Sim | Não |
| `/settings` | Configurações | Sim | Não |
| `/managers` | Gestores | Sim | Sim |
| `/invites` | Convites | Sim | Sim |

---

## Responsividade

O front é responsivo e funciona em desktop e mobile:

- **Nav:** Hamburger menu no mobile, links inline no desktop
- **Dashboard:** Cards de métricas em 2 colunas (mobile) / 4 (desktop), gráficos empilham verticalmente
- **Kanban:** Scroll horizontal no mobile com colunas de largura mínima
- **Cards de cliente:** Botões de ação com `flex-wrap`
- **Modais:** Padding lateral + scroll interno no mobile
- **Tabelas:** Scroll horizontal com `min-w-[600px]`

---

## Deploy

O front é compilado com Vite e servido pelo Nginx em produção (veja `Dockerfile.client`).

**Variável build-time no Coolify:**
```
VITE_API_URL=https://spidergestor-api.forjacorp.com/api
```

> Como `VITE_API_URL` é injetada no build, alterá-la exige um **redeploy** completo do container frontend.
