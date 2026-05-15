# Growth Ads — API

API Node.js (MVC) para coleta de dados de performance do **Meta Ads** via Graph API v25.0, com autenticação JWT e multi-tenancy.

---

## Tecnologias

- **Runtime:** Node.js + TypeScript (ESM)
- **Framework:** Express 5
- **ORM:** Prisma 7 (`@prisma/adapter-mariadb`)
- **Banco de Dados:** MySQL
- **Auth:** JWT (access + refresh tokens), bcrypt
- **Relatórios:** ExcelJS
- **Validação:** Zod
- **Scheduler:** node-cron (auto-sync diário)
- **Integração:** Meta Ads API (Graph API v25.0)

---

## Estrutura (MVC)

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts                     # Prisma Client + adapter MySQL
│   │   └── env.ts                    # Validação de env vars (Zod)
│   ├── controllers/
│   │   ├── alertController.ts       # List, countUnread, markRead, markAllRead, dismiss
│   │   ├── authController.ts         # Login, register, refresh, logout, me, updateProfile
│   │   ├── budgetController.ts       # Orçamento mensal por cliente
│   │   ├── clientController.ts       # CRUD de clientes + métricas + download (multi-tenant)
│   │   ├── goalController.ts         # Metas por métrica por cliente
│   │   ├── inviteController.ts       # CRUD de convites (admin)
│   │   ├── managerController.ts      # CRUD de gestores + vincular clientes (admin)
│   │   ├── settingsController.ts     # Token global + auto-sync
│   │   ├── syncController.ts         # Sync manual + breakdowns
│   │   └── taskController.ts          # CRUD de tarefas + status + reorder
│   ├── generated/
│   │   └── prisma/                   # Código gerado pelo Prisma 7
│   ├── integrations/
│   │   └── metaApi.ts                # Chamadas HTTP ao Meta Graph API (com paginação + breakdowns)
│   ├── middleware/
│   │   ├── auth.ts                   # authMiddleware (JWT), adminOnly, clientAccess
│   │   ├── errorHandler.ts           # Error handler global
│   │   └── validate.ts               # Validação Zod genérica
│   ├── repositories/
│   │   ├── adRepository.ts           # Queries de performance geral (upsert)
│   │   ├── alertRepository.ts        # Queries de alertas (CRUD + findDuplicate)
│   │   ├── audienceRepository.ts     # Queries de performance por público (sexo x idade)
│   │   ├── budgetRepository.ts       # Queries de orçamento mensal
│   │   ├── clientRepository.ts       # Queries de clientes (cascade delete)
│   │   ├── dashboardRepository.ts    # Queries agregadas para o Dashboard (filtro por gestor)
│   │   ├── goalRepository.ts         # Queries de metas por métrica
│   │   ├── inviteRepository.ts       # Queries de convites
│   │   ├── managerRepository.ts      # Queries de gestores + vínculos
│   │   ├── placementRepository.ts    # Queries de performance por plataforma
│   │   ├── refreshTokenRepository.ts # Queries de refresh tokens
│   │   ├── regionRepository.ts       # Queries de performance por região
│   │   ├── settingsRepository.ts     # Queries de settings (key-value)
│   │   └── taskRepository.ts          # Queries de tarefas (CRUD + reorder + position)
│   ├── routes/
│   │   ├── alertRoutes.ts             # Rotas de alertas (auth)
│   │   ├── authRoutes.ts             # Rotas de autenticação
│   │   ├── clientRoutes.ts           # Rotas de clientes (protegidas por auth)
│   │   ├── inviteRoutes.ts           # Rotas de convites (admin)
│   │   ├── managerRoutes.ts          # Rotas de gestores (admin)
│   │   ├── settingsRoutes.ts         # Rotas de settings (admin para escrita)
│   │   ├── syncRoutes.ts             # Rotas de sync (protegidas por auth)
│   │   └── taskRoutes.ts              # Rotas de tarefas (CRUD + status + reorder)
│   ├── services/
│   │   ├── alertService.ts           # Avaliação de alertas + dedup + integração com tasks
│   │   ├── authService.ts            # Hash, JWT, refresh token rotation
│   │   ├── breakdownSyncService.ts   # Sync de breakdowns (audience, placement, region)
│   │   ├── budgetService.ts          # Lógica de orçamento mensal
│   │   ├── clientService.ts          # Lógica de negócio (clientes)
│   │   ├── goalService.ts            # Lógica de metas por métrica
│   │   ├── inviteService.ts          # Geração/validação de convites
│   │   ├── reportService.ts          # Geração de Excel
│   │   ├── schedulerService.ts       # Cron job de auto-sync diário (com breakdowns)
│   │   ├── seedService.ts            # Auto-seed do admin no startup
│   │   ├── settingsService.ts        # Lógica de negócio (settings)
│   │   ├── syncProgress.ts           # EventEmitter singleton para SSE progress
│   │   ├── syncService.ts            # Sync com Meta Ads + resiliência
│   │   └── taskService.ts            # CRUD de tarefas + reorder + posição automática
│   ├── types/
│   │   └── index.ts                  # Interfaces compartilhadas
│   ├── utils/
│   │   ├── dateUtils.ts              # splitDates, formatDate
│   │   ├── retry.ts                  # Retry com backoff exponencial
│   │   └── tokenUtils.ts             # resolveToken — fallback automático (client → global)
│   └── app.ts                        # Entry point Express + seed admin
│
├── prisma/
│   └── schema.prisma                 # Schema completo
├── prisma.config.ts                  # Configuração do Prisma CLI
└── tsconfig.json                     # TypeScript config
```

---

## Endpoints

> Em desenvolvimento, as rotas são acessadas diretamente (ex: `POST /sync/manual`).
> Em produção (Docker), todas as rotas da API ficam sob o prefixo `/api` (ex: `POST /api/sync/manual`).

### Auth

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/auth/login` | Login (email + senha) → access + refresh tokens | -- |
| `POST` | `/auth/register/:token` | Cadastro via convite | -- |
| `POST` | `/auth/refresh` | Renovar access token via refresh token | -- |
| `POST` | `/auth/logout` | Invalidar refresh token | -- |
| `GET` | `/auth/me` | Dados do gestor logado | JWT |
| `PUT` | `/auth/me` | Atualizar perfil (nome, empresa, senha) | JWT |

### Clientes

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/clients` | Cadastra ou atualiza um cliente (auto-vincula ao manager) | JWT |
| `GET` | `/clients` | Lista clientes (admin: todos, manager: só os vinculados) | JWT |
| `GET` | `/clients/metrics` | Métricas do Dashboard (filtrado por gestor) | JWT |
| `GET` | `/clients/:actId/budget` | Orçamento do mês atual | JWT |
| `POST` | `/clients/:actId/budget` | Definir orçamento mensal | JWT |
| `GET` | `/clients/:actId/budget/history` | Histórico de orçamentos (últimos 12 meses) | JWT |
| `GET` | `/clients/:actId/goals` | Metas do mês atual | JWT |
| `POST` | `/clients/:actId/goals` | Definir meta mensal por métrica | JWT |
| `DELETE` | `/clients/:actId/goals/:id` | Remover meta | JWT |
| `PATCH` | `/clients/:actId/token` | Atualiza o token de um cliente | JWT |
| `DELETE` | `/clients/:actId` | Remove um cliente e todos seus dados (cascade) | JWT |
| `GET` | `/clients/:actId/download` | Download do relatório Excel | JWT |

### Sync

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/sync/manual` | Sincroniza dados gerais do Meta Ads por período | JWT |
| `POST` | `/sync/breakdown` | Sincroniza dados segmentados (público, plataforma ou região) | JWT |
| `POST` | `/sync/breakdown/all` | Sincroniza todas as segmentações de uma vez | JWT |
| `GET` | `/sync/progress` | SSE — stream de progresso do sync em tempo real | -- |

### Configurações

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/settings/global-token` | Retorna o token global configurado | JWT |
| `PUT` | `/settings/global-token` | Salva/atualiza o token global | Admin |
| `GET` | `/settings/auto-sync` | Retorna status do auto-sync (on/off) | Admin |
| `PUT` | `/settings/auto-sync` | Ativa/desativa o auto-sync | Admin |
| `POST` | `/settings/sync-all` | Dispara sincronização de todos os clientes | Admin |

### Convites (Admin)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/invites` | Criar convite (define plano, email opcional) | Admin |
| `GET` | `/invites` | Listar convites | Admin |
| `GET` | `/invites/verify/:token` | Verificar se convite é válido | -- |
| `DELETE` | `/invites/:id` | Revogar convite | Admin |

### Gestores (Admin)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/managers` | Listar todos os gestores | Admin |
| `GET` | `/managers/:id` | Detalhes de um gestor | Admin |
| `PUT` | `/managers/:id` | Editar gestor (plano, max_clients) | Admin |
| `DELETE` | `/managers/:id` | Desativar gestor (soft delete) | Admin |
| `POST` | `/managers/:id/clients/:actId` | Vincular cliente a gestor | Admin |
| `DELETE` | `/managers/:id/clients/:actId` | Desvincular cliente de gestor | Admin |

### Alertas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/alerts` | Listar alertas do gestor (não lidos primeiro) | JWT |
| `GET` | `/alerts/unread-count` | Contagem de alertas não lidos | JWT |
| `PATCH` | `/alerts/:id/read` | Marcar alerta como lido | JWT |
| `POST` | `/alerts/mark-all-read` | Marcar todos como lidos | JWT |
| `DELETE` | `/alerts/:id` | Descartar alerta | JWT |

### Tarefas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/tasks` | Listar tarefas (filtros: status, clientId, priority) | JWT |
| `GET` | `/tasks/counts` | Contagem por status | JWT |
| `POST` | `/tasks` | Criar tarefa | JWT |
| `PATCH` | `/tasks/:id` | Atualizar tarefa (título, descrição, prioridade, prazo, cliente) | JWT |
| `PATCH` | `/tasks/:id/status` | Mover tarefa para outra coluna (status) | JWT |
| `PATCH` | `/tasks/:id/reorder` | Reordenar posições após drag-and-drop | JWT |
| `DELETE` | `/tasks/:id` | Excluir tarefa | JWT |

---

## Exemplos

**Login:**

```json
POST /auth/login
{
  "email": "admin@exemplo.com",
  "password": "senha123"
}
```

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

Tipos disponíveis: `audience` (sexo x idade), `placement` (plataforma), `region` (região)

**Criar convite:**

```json
POST /invites
{
  "email": "gestor@exemplo.com",
  "plan": "pro"
}
```

---

## Banco de Dados

### Tabelas

| Tabela | Descrição | Chave única |
|--------|-----------|-------------|
| `clients_config` | Cadastro de clientes (act_id, token, etc.) | `act_id` |
| `meta_ads_performance` | Performance geral por anúncio/dia | `date + ad_id` |
| `ad_audience_performance` | Performance por sexo x idade | `date + ad_id + gender + age_range` |
| `ad_placement_performance` | Performance por plataforma (Facebook, Instagram, etc.) | `date + ad_id + platform` |
| `ad_region_performance` | Performance por região geográfica | `date + ad_id + region` |
| `app_settings` | Configurações da aplicação (key-value) | `key` |
| `managers` | Gestores (admin e manager) | `email` |
| `invites` | Convites para novos gestores | `token` |
| `manager_clients` | Vínculo N:N entre gestores e clientes | `manager_id + client_id` |
| `refresh_tokens` | Refresh tokens JWT | `token_hash` |
| `client_budgets` | Orçamento mensal por gestor+cliente | `manager_id + client_id + month` |
| `client_goals` | Metas por métrica por gestor+cliente | `manager_id + client_id + metric + month` |
| `alerts` | Alertas automáticos por gestor+cliente | `id` |
| `tasks` | Tarefas Kanban por gestor | `id` |

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

### Autenticação e Multi-Tenancy
- **JWT com rotação:** Access token (15min) + Refresh token (7d). Refresh gera novo par e invalida o anterior
- **Seed automático:** `seedService.seedAdmin()` cria o admin no primeiro startup a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- **Convites:** Admin gera tokens de 64 chars com expiração de 7 dias; novo gestor se registra via `/register/:token`
- **Middleware de acesso:** `authMiddleware` (JWT) + `adminOnly` (role check) + `clientAccess` (verifica `manager_clients`)
- **Multi-tenancy:** `GET /clients` filtra por gestor; `GET /clients/metrics` filtra dados de performance; `POST /clients` auto-vincula ao manager

### Dashboard (GET /clients/metrics)
- Métricas agregadas dos últimos 30 dias: investimento, leads, cliques, impressões, ROAS, CPL, CTR
- Breakdown por cliente (spend, leads, conversionValue, roas)
- Série temporal diária (spend, leads, clicks, conversionValue)
- Filtrado por gestor (managers só veem seus clientes)

### Sync Progress (SSE)
- `GET /sync/progress` abre um stream Server-Sent Events
- Eventos: `start`, `log`, `progress`, `done`, `error`
- Payload: `{ type, message, step?, progress?, records?, errors? }`

### Token Management
- **Token por cliente:** Cada cliente pode ter seu próprio token
- **Token global:** Fallback automático quando o token do cliente falha ou não existe
- **Fallback inteligente:** `resolveToken()` testa o token do cliente; se a Meta API rejeitar, usa o global automaticamente
- **Limpar token individual:** PATCH `/clients/:actId/token` com `access_token: ""` faz o cliente usar o global

### Breakdowns (Segmentação de público)
- **Público (sexo x idade):** Performance por gênero e faixa etária
- **Plataforma:** Performance por Facebook, Instagram, Messenger, etc.
- **Região:** Performance por estado/região geográfica
- **Sync independente:** Cada breakdown tem sua própria chamada à Meta API
- **Auto-sync integrado:** Breakdowns são sincronizados junto com o sync diário

### Auto-Sync (Scheduler)
- **Sync diário automático:** Roda às 02:00 da manhã (configurável via cron)
- **Toggle on/off:** Pode ser ativado/desativado pela tela de Settings
- **Sync manual de todos:** POST `/settings/sync-all`
- **Resiliência por cliente:** Se um cliente falhar, os demais continuam

### Sync resiliente
- **Paginação automática:** Segue os cursores `paging.next` da Meta API até buscar todas as páginas
- **Retry com backoff:** 3 tentativas com delay exponencial em caso de falha de rede
- **Resiliência por registro:** Se um registro falhar, os demais continuam salvando
- **Upsert sem duplicatas:** Chaves únicas por tabela garantem idempotência
- **Batch upsert:** `INSERT ... ON DUPLICATE KEY UPDATE` via raw SQL para inserção em lote (placeholders gerados dinamicamente a partir do array de colunas)
- **Auto-chunking:** `Math.floor(65000 / cols.length)` para respeitar o limite de 65.535 placeholders do MySQL
- **Preview links em paralelo:** Busca links de preview em lotes de 50 com `Promise.all` e cache em memória

### Relatórios Excel
- GET `/clients/:actId/download` gera um relatório Excel com os dados de performance do cliente

### Alertas Automáticos
- **Avaliação pós-sync:** Após cada sincronização, `alertService.evaluate()` verifica orçamento e metas de todos os gestores vinculados ao cliente
- **Regras de orçamento:** >100% = critical, >=80% = warning, <20% = info
- **Regras de metas:** >=100% = success, <50% = warning (CPL é inverso — menor é melhor)
- **Dedup mensal:** Mesmo tipo de alerta não é duplicado dentro do mês corrente
- **Sync events:** `onSyncSuccess` e `onSyncFailed` geram alertas info/critical respectivamente
- **Tarefas automáticas:** Alertas com severity `critical` criam tarefa automática no backlog via `taskService`

### Kanban de Tarefas
- **Status:** backlog → todo → in_progress → review → done
- **Prioridades:** low, medium, high, urgent
- **Posição automática:** Novas tarefas recebem posição = max + 1 na coluna backlog
- **Mudança de status:** Ao mover tarefa para outra coluna, posição é automaticamente a última da coluna destino
- **Reorder:** Endpoint para reordenar tarefas dentro de uma coluna após drag-and-drop
- **Vinculação:** Tarefa pode ser vinculada a cliente e alerta (opcional)

### Integração com BI (Looker / Metabase)
- Tabelas denormalizadas (uma por dimensão) para queries simples
- Cada tabela contém métricas completas (sem necessidade de JOINs para métricas)
- JOIN possível por `client_id + ad_id + date` entre tabelas
