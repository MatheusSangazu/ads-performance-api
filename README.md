# Growth Ads

Plataforma SaaS de coleta e visualização de dados de performance do **Meta Ads** para gestores de tráfego, com API Node.js (MVC) e front React. Dados prontos para consumo em **Looker** e **Metabase**.

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| **API** | Node.js + TypeScript (ESM), Express 5, Prisma 7, MySQL |
| **Front** | React 19, Vite, Tailwind CSS 4, Recharts, @dnd-kit |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Integração** | Meta Ads Graph API v25.0 |
| **Relatórios** | ExcelJS |
| **Validação** | Zod (frontend + backend) |
| **Scheduler** | node-cron (auto-sync diário) |

---

## Setup

```bash
git clone https://github.com/MatheusSangazu/ads-performance-api.git
cd growth-ads-api
npm install
```

### Configurar `.env`

```env
# Banco de Dados MySQL
DB_HOST=seu_host
DB_USER=seu_usuario
DB_PASSWORD="sua_senha"           # Aspas obrigatórias se conter # ou caracteres especiais
DB_NAME=growth_ads_db
DATABASE_URL="mysql://usuario:senha@host:3306/growth_ads_db"
PORT=3001

# Auth
JWT_SECRET=sua_chave_secreta
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD="senha_do_admin"
```

> Senhas com `#` no `.env` **devem** estar entre aspas para evitar truncamento pelo dotenv.

### Gerar o Prisma Client + Migrations

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### Rodar

```bash
npm run dev          # API + Front simultaneamente
npm run dev:api      # Só a API
npm run dev:client   # Só o front
```

O primeiro startup cria automaticamente o admin com base em `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## Estrutura do Projeto

```
growth-ads-api/
├── server/                  # API (Node.js + Express)
│   ├── src/                 # Código-fonte TypeScript (MVC)
│   │   ├── config/          # DB, env
│   │   ├── controllers/     # Auth, Clients, Sync, Settings, Managers, Invites, Tasks, Alerts
│   │   ├── middleware/      # Auth (JWT), AdminOnly, ClientAccess, Validate
│   │   ├── repositories/    # Data access (Prisma + raw SQL)
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Business logic
│   │   └── ...
│   ├── prisma/              # Schema + migrações
│   ├── prisma.config.ts
│   └── README.md            # Documentação completa da API
│
├── client/                  # Front React
│   └── src/
│       ├── components/      # Componentes React (Layout, ClientCard, SyncModal, etc.)
│       ├── contexts/        # AuthContext (login, logout, refresh)
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Axios API client + tipos
│       ├── pages/           # Login, Register, Dashboard, Clients, Tasks, Settings, Managers, Invites
│       └── ...
│
├── docs/                    # Documentação
│   ├── funcionalidades.md  # Roadmap e especificações
│   └── guia-desenvolvimento.md  # Guia para devs e IA
│
├── Dockerfile               # Build multi-stage (API + Front)
├── docker-compose.yml
├── package.json             # Scripts e dependências
└── .env
```

> Documentação completa da API: [server/README.md](server/README.md)

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | API + Front simultaneamente (concurrently) |
| `npm run dev:api` | Só a API (tsx watch) |
| `npm run dev:client` | Só o front (Vite) |
| `npm run build` | Compila TypeScript (`server/dist/`) |
| `npm start` | Roda a API compilada |

---

## Deploy (Docker)

```bash
docker compose up -d --build
```

Build multi-stage que compila API + Front em um único container. Em produção, o Express serve o front estático e as rotas da API ficam sob `/api`.

---

## Funcionalidades

### Autenticação e Multi-Tenancy
- **Login/JWT:** Access token (15min) + Refresh token (7d) com rotação
- **Multi-gestor:** Admin gerencia gestores via convites; gestores só veem seus clientes
- **Convites:** Admin cria convites com plano definido, novo gestor se registra via link
- **Middleware de acesso:** `authMiddleware` (JWT) + `adminOnly` + `clientAccess` (multi-tenancy)
- **Seed automático:** Admin criado no primeiro startup via `ADMIN_EMAIL` / `ADMIN_PASSWORD`

### Dashboard e Dados
- **Dashboard:** Métricas agregadas, gráficos de tendência, ranking por cliente
- **Sync em tempo real:** Modal com logs via SSE, barra de progresso global por fases, minimizar
- **Sync otimizado:** Batch upsert via raw SQL com chunking automático (respeita limite MySQL de 65k placeholders)
- **Breakdowns:** Público (sexo x idade), plataforma, região
- **Auto-Sync:** Cron job diário com toggle on/off
- **Token Management:** Token por cliente + fallback global automático (testa client token, usa global se falhar) + botão "Usar global" no card
- **CRUD de clientes:** Cadastro, edição de token, limpar token, exclusão cascade, download Excel
- **BI-ready:** Tabelas denormalizadas para Looker e Metabase

### Orçamento e Metas
- **Orçamento mensal por cliente:** Gestor define o budget do mês; barra de progresso mostra % investido com cores (verde/amarelo/vermelho)
- **Metas por métrica:** Gestor define metas mensais para leads, CPL, ROAS, CTR, cliques, impressões, compras, valor de compras
- **Progresso visual:** Cada meta mostra valor atual vs. target com indicador de atingimento (CPL é inverso — menor é melhor)
- **Isolamento por gestor:** Orçamentos e metas são por gestor+cliente, cada gestor pode ter suas próprias metas para o mesmo cliente

### Alertas e Notificações
- **Alertas automáticos:** Avaliados após cada sync — orçamento excedido (>100%), acima de 80%, subutilizado (<20%), meta atingida, meta atrasada (<50%), sync falhou
- **Dedup mensal:** Mesmo tipo de alerta não é duplicado dentro do mês
- **Severidades:** info, warning, critical, success — com ícones e cores no dropdown do navbar
- **Dropdown de alertas:** Badge com contagem de não lidos, lista com marcar como lido e descartar, auto-refresh a cada 60s

### Kanban de Tarefas
- **Board com 5 colunas:** Backlog, A Fazer, Em Progresso, Revisão, Concluído — com drag-and-drop via @dnd-kit
- **CRUD completo:** Criar, editar, excluir tarefas com título, descrição, prioridade (baixa/média/alta/urgente), prazo, cliente vinculado
- **Ordenação por posição:** Cada tarefa tem posição dentro da coluna, mantida após drag-and-drop
- **Tarefas automáticas:** Alertas críticos (budget_exceeded, sync_failed) criam tarefa automática no backlog com prioridade urgent/high
- **Filtros:** Por status, cliente e prioridade via query params

---

## Segurança

- JWT com rotação de refresh tokens (antigo invalidado a cada renovação)
- Senhas hasheadas com bcrypt (10 salt rounds)
- Tokens e credenciais apenas no `.env` (nunca versionar)
- Variáveis de ambiente validadas no startup com Zod
- Validação de input no backend com Zod
- Error handler global que não vaza stack traces em produção
- Middleware de acesso por cliente (managers só acessam clientes vinculados)
