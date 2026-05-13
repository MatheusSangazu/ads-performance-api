# Growth Ads

Plataforma de coleta e visualização de dados de performance do **Meta Ads**, com API Node.js (MVC) e front React. Dados prontos para consumo em **Looker** e **Metabase**.

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| **API** | Node.js + TypeScript (ESM), Express 5, Prisma 7, MySQL |
| **Front** | React 19, Vite, Tailwind CSS 4, Recharts |
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
DB_HOST=seu_host
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=growth_ads_db
DATABASE_URL="mysql://usuario:senha@host:3306/growth_ads_db"
PORT=3001
```

### Gerar o Prisma Client

```bash
cd server && npx prisma generate
```

### Rodar

```bash
npm run dev          # API + Front simultaneamente
npm run dev:api      # Só a API
npm run dev:client   # Só o front
```

---

## Estrutura do Projeto

```
growth-ads-api/
├── server/                  # API (Node.js + Express)
│   ├── src/                 # Código-fonte TypeScript (MVC)
│   ├── prisma/              # Schema + migrações
│   ├── tsconfig.json
│   ├── prisma.config.ts
│   └── README.md            # Documentação completa da API
│
├── client/                  # Front React
│   └── src/
│       ├── components/      # Componentes React
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Axios + tipos
│       ├── pages/           # Páginas (Dashboard, Clients, Settings)
│       └── ...
│
├── Dockerfile               # Build multi-stage (API + Front)
├── docker-compose.yml
├── package.json             # Scripts e dependências
└── .env
```

> 📄 Documentação completa da API: [server/README.md](server/README.md)

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

- **Dashboard:** Métricas agregadas, gráficos de tendência, ranking por cliente
- **Sync em tempo real:** Modal com logs via SSE, barra de progresso, minimizar
- **Breakdowns:** Público (sexo × idade), plataforma, região
- **Auto-Sync:** Cron job diário com toggle on/off
- **Token Management:** Token por cliente + fallback global
- **CRUD de clientes:** Cadastro, edição de token, exclusão cascade, download Excel
- **BI-ready:** Tabelas denormalizadas para Looker e Metabase

---

## Segurança

- Tokens e credenciais apenas no `.env` (nunca versionar)
- Variáveis de ambiente validadas no startup com Zod
- Validação de input no backend com Zod
- Error handler global que não vaza stack traces em produção
