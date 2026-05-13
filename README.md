# Growth Ads

Plataforma de coleta e visualização de dados de performance do **Meta Ads**, com API Node.js (MVC) e front React. Dados prontos para consumo em **Looker** e **Metabase**.

---

## Tecnologias

### API
- **Runtime:** Node.js + TypeScript (ESM)
- **Framework:** Express 5
- **ORM:** Prisma 7 (`@prisma/adapter-mariadb`)
- **Banco de Dados:** MySQL
- **Relatórios:** ExcelJS 
- **Validação:** Zod
- **Scheduler:** node-cron (auto-sync diário)
- **Integração:** Meta Ads API (Graph API v25.0)

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

> Em desenvolvimento, as rotas são acessadas diretamente (ex: `POST /sync/manual`).
> Em produção (Docker), todas as rotas da API ficam sob o prefixo `/api` (ex: `POST /api/sync/manual`).

### Clientes

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/clients` | Cadastra ou atualiza um cliente |
| `GET` | `/clients` | Lista todos os clientes |
| `PATCH` | `/clients/:actId/token` | Atualiza o token de um cliente |
| `DELETE` | `/clients/:actId` | Remove um cliente e todos seus dados (cascade) |
| `GET` | `/clients/metrics` | Métricas agregadas do Dashboard (últimos 30 dias) |
| `GET` | `/clients/:actId/download` | Download do relatório Excel |

### Sync

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/sync/manual` | Sincroniza dados gerais do Meta Ads por período |
| `POST` | `/sync/breakdown` | Sincroniza dados segmentados (público, plataforma ou região) |
| `POST` | `/sync/breakdown/all` | Sincroniza todas as segmentações de uma vez |
| `GET` | `/sync/progress` | SSE — stream de progresso do sync em tempo real |

### Configurações

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/settings/global-token` | Retorna o token global configurado |
| `PUT` | `/settings/global-token` | Salva/atualiza o token global |
| `GET` | `/settings/auto-sync` | Retorna status do auto-sync (on/off) |
| `PUT` | `/settings/auto-sync` | Ativa/desativa o auto-sync |
| `POST` | `/settings/sync-all` | Dispara sincronização de todos os clientes |

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

**Sincronizar dados gerais:**

```json
POST /sync/manual
{
  "act_id": "act_123456789",
  "since": "2025-01-01",
  "until": "2025-05-23"
}
```

**Sincronizar breakdown individual:**

```json
POST /sync/breakdown
{
  "act_id": "act_123456789",
  "since": "2025-01-01",
  "until": "2025-05-23",
  "type": "audience"
}
```

Tipos disponíveis: `audience` (sexo × idade), `placement` (plataforma), `region` (região)

**Sincronizar todos os breakdowns:**

```json
POST /sync/breakdown/all
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

**Ativar auto-sync diário:**

```json
PUT /settings/auto-sync
{
  "enabled": true
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

## Deploy (Docker)

Build multi-stage que compila API + Front em um único container:

```bash
docker compose up -d --build
```

O Dockerfile:
1. Instala dependências e gera o Prisma Client
2. Compila TypeScript (`dist/`)
3. Build do React (`client/dist/`)
4. Copia tudo para uma imagem slim de produção

Em produção, o Express serve o front estático e as rotas da API ficam sob `/api`.

---

## Estrutura (MVC)

```
growth-ads-api/
├── src/                              # API
│   ├── config/
│   │   ├── db.ts                     # Prisma Client + adapter MySQL
│   │   └── env.ts                    # Validação de env vars (Zod)
│   ├── controllers/
│   │   ├── clientController.ts       # CRUD de clientes + download
│   │   ├── settingsController.ts     # Token global + auto-sync
│   │   └── syncController.ts         # Sync manual + breakdowns
│   ├── generated/
│   │   └── prisma/                   # Código gerado pelo Prisma 7
│   ├── integrations/
│   │   └── metaApi.ts                # Chamadas HTTP ao Meta Graph API (com paginação + breakdowns)
│   ├── middleware/
│   │   ├── errorHandler.ts           # Error handler global
│   │   └── validate.ts               # Validação Zod genérica
│   ├── repositories/
│   │   ├── adRepository.ts           # Queries de performance geral (upsert)
│   │   ├── audienceRepository.ts     # Queries de performance por público (sexo × idade)
│   │   ├── clientRepository.ts       # Queries de clientes (cascade delete)
│   │   ├── dashboardRepository.ts    # Queries agregadas para o Dashboard
│   │   ├── placementRepository.ts    # Queries de performance por plataforma
│   │   ├── regionRepository.ts       # Queries de performance por região
│   │   └── settingsRepository.ts     # Queries de settings (key-value)
│   ├── routes/
│   │   ├── clientRoutes.ts           # Rotas de clientes
│   │   ├── settingsRoutes.ts         # Rotas de settings
│   │   └── syncRoutes.ts             # Rotas de sync (manual + breakdowns)
│   ├── services/
│   │   ├── breakdownSyncService.ts   # Sync de breakdowns (audience, placement, region)
│   │   ├── clientService.ts          # Lógica de negócio (clientes)
│   │   ├── reportService.ts          # Geração de Excel
│   │   ├── schedulerService.ts       # Cron job de auto-sync diário (com breakdowns)
│   │   ├── settingsService.ts        # Lógica de negócio (settings)
│   │   ├── syncProgress.ts           # EventEmitter singleton para SSE progress
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
│       │   ├── ClientCard.tsx        # Card (sync, token, excel, delete)
│       │   ├── ClientForm.tsx        # Formulário de cadastro
│       │   ├── SyncForm.tsx          # Formulário de sync com pré-filtros + checkboxes de breakdown
│       │   ├── SyncProgressModal.tsx # Modal de progresso do sync em tempo real (SSE)
│       │   ├── Layout.tsx            # Layout com navegação
│       │   └── ui/
│       │       └── Message.tsx       # Componente de mensagem reutilizável
│       ├── hooks/
│       │   └── useClients.ts         # Custom hooks (useClients, useSync, useDownload)
│       ├── lib/
│       │   └── api.ts                # Axios + tipos + chamadas à API
│       ├── pages/
│       │   ├── Dashboard.tsx         # Dashboard
│       │   ├── Clients.tsx           # Gestão de clientes
│       │   └── Settings.tsx          # Token global + auto-sync
│       ├── App.tsx                   # Router
│       ├── main.tsx                  # Entry point
│       └── index.css                 # Tailwind
│
├── prisma/
│   └── schema.prisma                 # Schema (Client, AdPerformance, AdAudiencePerformance,
│                                     #        AdPlacementPerformance, AdRegionPerformance, AppSettings)
├── prisma.config.ts                  # Configuração do Prisma CLI
├── Dockerfile                        # Build multi-stage (API + Front)
├── docker-compose.yml                # Orquestração de container
└── tsconfig.json                     # TypeScript config
```

---

## Banco de Dados

### Tabelas

| Tabela | Descrição | Chave única |
|--------|-----------|-------------|
| `clients_config` | Cadastro de clientes (act_id, token, etc.) | `act_id` |
| `meta_ads_performance` | Performance geral por anúncio/dia | `date + ad_id` |
| `ad_audience_performance` | Performance por sexo × idade | `date + ad_id + gender + age_range` |
| `ad_placement_performance` | Performance por plataforma (Facebook, Instagram, etc.) | `date + ad_id + platform` |
| `ad_region_performance` | Performance por região geográfica | `date + ad_id + region` |
| `app_settings` | Configurações da aplicação (key-value) | `key` |

### Métricas por tabela

Todas as tabelas de performance compartilham as mesmas métricas:

| Métrica | Campo | Tipo |
|---------|-------|------|
| Alcance | `reach` | Int |
| Impressões | `impressions` | Int |
| Investimento | `spend` | Decimal |
| Cliques no link | `linkClicks` | Int |
| CTR | `ctr` | Decimal |
| Conversas (messaging) | `messagingConversations` | Int |
| Leads | `leads` | Int |
| Leads via formulário | `leadsForm` | Int |
| Page views | `pageViews` | Int |
| Adições ao carrinho | `addToCart` | Int |
| Inícios de checkout | `initiateCheckout` | Int |
| Compras | `purchases` | Int |
| Valor de compras | `purchaseValue` | Decimal |
| Conversão customizada (qtd) | `customConversionCount` | Int |
| Conversão customizada (valor) | `customConversionValue` | Decimal |
| Valor total de conversão | `totalConversionValue` | Decimal |
| ROAS | `roas` | Decimal |

---

## Funcionalidades

### Dashboard
- **Métricas agregadas:** Cards com total de clientes, investimento, leads, cliques, impressões, ROAS, CPL e CTR
- **Período automático:** Últimos 30 dias
- **Gráfico de tendência:** Área com investimento e leads por dia (Recharts)
- **Performance por cliente:** Gráfico de barras comparando clientes
- **Ranking:** Tabela ordenada por investimento com CPL e ROAS por cliente

### Sync Progress (Tempo Real)
- **Modal de progresso:** Aparece automaticamente ao iniciar um sync
- **Logs em tempo real:** Streaming via SSE (Server-Sent Events)
- **Barra de progresso:** Porcentagem visual da sincronização
- **Minimizar:** Reduz para um widget pequeno no canto inferior
- **Fechar:** O sync continua no backend mesmo com o modal fechado
- **Logs coloridos:** Erros em vermelho, sucesso em verde, início em azul

### Token Management
- **Token por cliente:** Cada cliente pode ter seu próprio token
- **Token global:** Fallback automático quando um cliente não tem token próprio
- **Atualização fácil:** Botão "Token" no card do cliente para trocar inline

### Breakdowns (Segmentação de público)
- **Público (sexo × idade):** Performance por gênero e faixa etária
- **Plataforma:** Performance por Facebook, Instagram, Messenger, etc.
- **Região:** Performance por estado/região geográfica
- **Sync independente:** Cada breakdown tem sua própria chamada à Meta API
- **Auto-sync integrado:** Breakdowns são sincronizados junto com o sync diário

### Auto-Sync (Scheduler)
- **Sync diário automático:** Roda às 02:00 da manhã (configurável via cron)
- **Toggle on/off:** Pode ser ativado/desativado pela tela de Settings
- **Sync manual de todos:** Botão "Sincronizar Todos Agora" disponível
- **Quick Sync por cliente:** Botão "Sync" no card puxa os dados do dia atual
- **Resiliência por cliente:** Se um cliente falhar, os demais continuam

### Sync resiliente
- **Paginação automática:** Segue os cursores `paging.next` da Meta API até buscar todas as páginas
- **Retry com backoff:** 3 tentativas com delay exponencial em caso de falha de rede
- **Resiliência por registro:** Se um registro falhar, os demais continuam salvando
- **Upsert sem duplicatas:** Chaves únicas por tabela garantem idempotência

### Pré-filtros de data
- Botões rápidos: Hoje, 7 dias, 30 dias, 90 dias, 6 meses, 1 ano, 2 anos
- Campos de data ainda editáveis manualmente

### CRUD completo de clientes
- Cadastro com validação (Zod frontend + backend)
- Edição de token inline
- Exclusão com confirmação (cascade: remove todas as tabelas de performance)
- Download de relatório Excel por cliente

### Integração com BI (Looker / Metabase)
- Tabelas denormalizadas (uma por dimensão) para queries simples
- Cada tabela contém métricas completas (sem necessidade de JOINs para métricas)
- JOIN possível por `client_id + ad_id + date` entre tabelas

---

## Segurança

- Tokens e credenciais devem ficar apenas no `.env` (nunca versionar)
- Variáveis de ambiente validadas no startup com Zod (`src/config/env.ts`)
- Validação de input no backend com Zod (nunca confie só no frontend)
- Error handler global que não vaza stack traces em produção
- Em produção, adicionar autenticação (JWT ou API Key)
