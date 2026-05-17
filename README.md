# Growth Ads (SpiderGestor)

Plataforma SaaS de coleta e visualização de dados de performance do **Meta Ads** para gestores de tráfego, com API Node.js (MVC) e front React. Dados prontos para consumo em **Looker** e **Metabase**.

**Produção:** [spidergestor.forjacorp.com](https://spidergestor.forjacorp.com) | **API:** [spidergestor-api.forjacorp.com](https://spidergestor-api.forjacorp.com)

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| **API** | Node.js + TypeScript (ESM), Express 5, Prisma 7, MySQL |
| **Front** | React 19, Vite 8, Tailwind CSS 4, Recharts, @dnd-kit |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Integração** | Meta Ads Graph API v25.0, Evolution API (WhatsApp) |
| **Relatórios** | ExcelJS |
| **Validação** | Zod (frontend + backend) |
| **Scheduler** | node-cron (auto-sync diário) |
| **Deploy** | Coolify (self-hosted PaaS) + Traefik + Let's Encrypt |

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
DB_PASSWORD="sua_senha"
DB_NAME=growth_ads_db
DATABASE_URL="mysql://usuario:senha@host:3306/growth_ads_db"
PORT=3001

# Auth
JWT_SECRET=sua_chave_secreta
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD="senha_do_admin"

# Frontend (build-time)
VITE_API_URL=http://localhost:3001/api

# CORS
CORS_ORIGIN=http://localhost:5173

# Evolution API (WhatsApp — opcional)
EVO_API_URL=https://sua-evolution-api.com
EVO_API_KEY=sua_api_key
EVO_INSTANCE_NAME=sua_instancia
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
│   │   ├── integrations/    # Meta Graph API (paginação + breakdowns)
│   │   ├── middleware/      # Auth (JWT), AdminOnly, ClientAccess, Validate
│   │   ├── repositories/    # Data access (Prisma + raw SQL)
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Business logic (sync, alerts, scheduler, evo, etc.)
│   │   └── ...
│   ├── prisma/              # Schema + migrações
│   ├── Dockerfile           # Build multi-stage (Node.js)
│   └── README.md            # Documentação completa da API
│
├── client/                  # Front React
│   └── src/
│       ├── components/      # Layout, ClientCard, TaskBoard, SyncModal, HelpTooltip, etc.
│       ├── contexts/        # AuthContext (login, logout, refresh)
│       ├── lib/             # Axios API client + tipos
│       ├── pages/           # Login, Register, Dashboard, Clients, Tasks, Settings, Managers, Invites
│       └── ...
│   ├── Dockerfile.client    # Build multi-stage (Vite + Nginx)
│   ├── nginx.conf           # SPA routing
│   └── README.md            # Documentação do front
│
├── docs/                    # Documentação
│   ├── funcionalidades.md  # Roadmap e especificações
│   └── guia-desenvolvimento.md  # Guia para devs e IA
│
├── docker-compose.yml       # 2 serviços: api + frontend
├── package.json             # Scripts e dependências
└── .env
```

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

## Deploy

### Coolify (Self-hosted PaaS)

O projeto roda em **2 containers separados** no Coolify:

| Serviço | Dockerfile | Porta | Domínio |
|---------|-----------|-------|---------|
| **API** | `Dockerfile` | 3001 | `spidergestor-api.forjacorp.com` |
| **Frontend** | `Dockerfile.client` | 80 | `spidergestor.forjacorp.com` |

SSL automático via Traefik + Let's Encrypt.

**Variáveis no Coolify (API):**
- Todas as env vars do `.env` (DB, JWT, ADMIN, CORS_ORIGIN, Evolution API)
- `CORS_ORIGIN=https://spidergestor.forjacorp.com`

**Variáveis no Coolify (Frontend):**
- `VITE_API_URL=https://spidergestor-api.forjacorp.com/api` (build arg, exige redeploy para alterar)

### Docker Compose (local)

```bash
docker compose up -d --build
```

---

## Funcionalidades

### Autenticação e Multi-Tenancy
- **Login/JWT:** Access token (15min) + Refresh token (7d) com rotação
- **Multi-gestor:** Admin gerencia gestores via convites; gestores só veem seus clientes
- **Convites:** Admin cria convites com plano definido, novo gestor se registra via link
- **Middleware de acesso:** `authMiddleware` (JWT) + `adminOnly` + `clientAccess` (multi-tenancy)
- **Seed automático:** Admin criado no primeiro startup via `ADMIN_EMAIL` / `ADMIN_PASSWORD`

### Dashboard e Dados Analíticos
- **Filtros Avançados:** Filtro por período de datas e cliente específico para isolar análises
- **Gráficos de Tendência e Metas:** Acompanhamento diário e acompanhamento do valor atual vs meta
- **Top Anúncios:** Ranking de criativos por qualquer métrica (ROAS, CPL, Leads, Investimento)
- **Preview de Mídias:** Download automático de criativos em alta resolução (imagens e vídeos) com modal fullscreen
- **Gráficos Demográficos:** Distribuição por plataformas, público (Sexo x Idade) e top 10 regiões
- **Responsivo:** Layout adaptado para desktop e mobile (hamburger menu, grids flexíveis, scroll horizontal no Kanban)
- **Tooltips de ajuda:** Ícone "?" nos campos de token com passo a passo para obter e estender tokens da Meta

### Integração WhatsApp (Evolution API)
- **Saúde das Contas:** Checagem automática do status na Meta API com badges visuais nos cards
- **Notificações Programadas:** Gestor configura horários para receber alertas via WhatsApp
- **Resumo Semanal:** Relatório automatizado semanal do desempenho geral dos clientes

### Orçamento e Metas
- **Orçamento mensal por cliente:** Budget com barra de progresso e cores (verde/amarelo/vermelho)
- **Metas por métrica:** Leads, CPL, ROAS, CTR, cliques, impressões, compras, valor de compras
- **Isolamento por gestor:** Orçamentos e metas são por gestor+cliente

### Alertas e Notificações
- **Alertas automáticos:** Avaliados após cada sync — orçamento excedido, acima de 80%, subutilizado, meta atingida, sync falhou
- **Dedup mensal:** Mesmo tipo de alerta não é duplicado dentro do mês
- **Tarefas automáticas:** Alertas críticos criam tarefa automática no backlog

### Kanban de Tarefas
- **Board com 5 colunas:** Backlog, A Fazer, Em Progresso, Revisão, Concluído — drag-and-drop via @dnd-kit
- **CRUD completo:** Título, descrição, prioridade (baixa/média/alta/urgente), prazo, cliente vinculado
- **Filtros:** Por status, cliente e prioridade

---

## Segurança

- JWT com rotação de refresh tokens (antigo invalidado a cada renovação)
- Senhas hasheadas com bcrypt (10 salt rounds)
- Tokens e credenciais apenas no `.env` (nunca versionar)
- Variáveis de ambiente validadas no startup com Zod
- Validação de input no backend com Zod
- Error handler global que não vaza stack traces em produção
- Middleware de acesso por cliente (managers só acessam clientes vinculados)
- HTTPS em trânsito (Traefik + Let's Encrypt)
- Inputs de token com `autoComplete="off"` para evitar preenchimento pelo navegador
