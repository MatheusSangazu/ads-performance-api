# Growth Ads

Plataforma de coleta e visualização de dados de performance do **Meta Ads**, com API Node.js (MVC) e front React.

---

## Tecnologias

### API
- **Runtime:** Node.js + TypeScript (ESM)
- **Framework:** Express 5
- **ORM:** Prisma 7
- **Banco de Dados:** MySQL
- **Relatórios:** ExcelJS
- **Validação:** Zod
- **Integração:** Meta Ads API (Graph API v23.0)

### Front
- **React 19 + Vite + TypeScript**
- **Tailwind CSS 4**
- **React Router**
- **React Hook Form + Zod** (validação)
- **Recharts** (gráficos)
- **Lucide React** (ícones)
- **Axios**

---

## Setup

### 1. Clonar e instalar

```bash
git clone https://github.com/MatheusSangazu/ads-performance-api.git
cd growth-ads-api
npm install
```

### 2. Configurar `.env`

Criar um arquivo `.env` na raiz com:

```env
DB_HOST=seu_host
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=growth_ads_db

DATABASE_URL="mysql://usuario:senha@host:3306/growth_ads_db"

PORT=3001
```

### 3. Gerar o Prisma Client

```bash
npx prisma generate
```

### 4. Rodar tudo com um comando

```bash
npm run dev
```

Isso sobe a API (porta 3001) e o front (porta 5173) simultaneamente.

Para rodar individualmente:

```bash
npm run dev:api       # só a API
npm run dev:client    # só o front
```

---

## Endpoints

### Clientes

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/clients` | Cadastra ou atualiza um cliente |
| `GET` | `/clients` | Lista todos os clientes |
| `PATCH` | `/clients/:actId/token` | Atualiza o token de um cliente |
| `DELETE` | `/clients/:actId` | Remove um cliente e seus dados |
| `GET` | `/clients/:actId/download` | Download do relatório Excel |

### Sync

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/sync/manual` | Sincroniza dados do Meta Ads |

### Configurações

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/settings/global-token` | Retorna o token global |
| `PUT` | `/settings/global-token` | Salva/atualiza o token global |

### Exemplos

**Cadastrar cliente:**

```json
POST /clients
{
  "name": "Nome do Cliente",
  "act_id": "act_123456789",
  "access_token": "token_meta_ads",
  "custom_event_id": "opcional"
}
```

**Sincronizar dados:**

```json
POST /sync/manual
{
  "act_id": "act_123456789",
  "since": "2025-01-01",
  "until": "2025-05-23"
}
```

**Token global (fallback para clientes sem token próprio):**

```json
PUT /settings/global-token
{
  "token": "seu_token_meta_ads"
}
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | API + Front simultaneamente (concurrently) |
| `npm run dev:api` | Só a API (tsx watch) |
| `npm run dev:client` | Só o front (Vite) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Roda a API compilada |

---

## Estrutura (MVC)

```
growth-ads-api/
├── src/                              # API
│   ├── config/
│   │   ├── db.ts                     # Prisma Client + adapter MySQL
│   │   └── env.ts                    # Validação de env vars (Zod)
│   ├── controllers/
│   │   ├── clientController.ts       # CRUD de clientes
│   │   ├── settingsController.ts     # Token global
│   │   └── syncController.ts         # Sincronização
│   ├── generated/
│   │   └── prisma/                   # Código gerado pelo Prisma
│   ├── integrations/
│   │   └── metaApi.ts                # Chamadas HTTP ao Meta Graph API
│   ├── middleware/
│   │   ├── errorHandler.ts           # Error handler global
│   │   └── validate.ts               # Validação Zod genérica
│   ├── repositories/
│   │   ├── adRepository.ts           # Queries de performance
│   │   ├── clientRepository.ts       # Queries de clientes
│   │   └── settingsRepository.ts     # Queries de settings
│   ├── routes/
│   │   ├── clientRoutes.ts           # Rotas de clientes
│   │   ├── settingsRoutes.ts         # Rotas de settings
│   │   └── syncRoutes.ts             # Rota de sync
│   ├── services/
│   │   ├── clientService.ts          # Lógica de negócio (clientes)
│   │   ├── reportService.ts          # Geração de Excel
│   │   ├── settingsService.ts        # Lógica de negócio (settings)
│   │   └── syncService.ts            # Sync com Meta Ads + resiliência
│   ├── types/
│   │   └── index.ts                  # Interfaces compartilhadas
│   ├── utils/
│   │   ├── dateUtils.ts              # splitDates, formatDate
│   │   └── retry.ts                  # Retry com backoff exponencial
│   └── app.ts                        # Entry point Express
│
├── client/                           # Front React
│   └── src/
│       ├── components/
│       │   ├── ClientCard.tsx        # Card do cliente (token, excel, delete)
│       │   ├── ClientForm.tsx        # Formulário de cadastro
│       │   ├── SyncForm.tsx          # Formulário de sync com pré-filtros
│       │   ├── Layout.tsx            # Layout com navegação
│       │   └── ui/
│       │       └── Message.tsx       # Componente de mensagem
│       ├── hooks/
│       │   └── useClients.ts         # Custom hooks (useClients, useSync, useDownload)
│       ├── lib/
│       │   └── api.ts                # Axios + tipos + chamadas à API
│       ├── pages/
│       │   ├── Dashboard.tsx         # Dashboard
│       │   ├── Clients.tsx           # Gestão de clientes
│       │   └── Settings.tsx          # Token global
│       ├── App.tsx                   # Router
│       ├── main.tsx                  # Entry point
│       └── index.css                 # Tailwind
│
├── prisma/
│   └── schema.prisma                 # Schema (Client, AdPerformance, AppSettings)
└── prisma.config.ts                  # Configuração do Prisma CLI
```

---

## Funcionalidades

### Token Management
- **Token por cliente:** Cada cliente pode ter seu próprio token
- **Token global:** Fallback automático quando um cliente não tem token
- **Atualização fácil:** Botão "Token" no card do cliente para trocar sem recriar

### Sync resiliente
- **Paginação automática:** Busca todas as páginas da Meta API (sem limite de 500)
- **Retry com backoff:** 3 tentativas com delay exponencial em caso de falha
- **Resiliência por registro:** Se um registro falhar, os demais continuam salvando
- **Relatório detalhado:** Retorna contagem de salvos, erros e detalhes por período

### Pré-filtros de data
- Botões rápidos: Hoje, 7 dias, 30 dias, 90 dias, 6 meses, 1 ano, 2 anos
- Campos de data ainda editáveis manualmente

### CRUD completo de clientes
- Cadastro com validação (Zod frontend + backend)
- Edição de token inline
- Exclusão com confirmação (remove dados de performance juntos)
- Download de relatório Excel por cliente

---

## Segurança

- Tokens e credenciais devem ficar apenas no `.env` (nunca versionar)
- Variáveis de ambiente validadas no startup com Zod
- Validação de input no backend com Zod (nunca confie só no frontend)
- Em produção, adicionar autenticação (JWT ou API Key)
