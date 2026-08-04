# Growth Ads — Funcionalidades e Roadmap

> Documento de referência para todas as funcionalidades a implementar, organizadas por fase, com detalhes técnicos de banco de dados, API e frontend.

---

## Fase 1 — Autenticação e Multi-Tenancy

> **Objetivo:** Transformar a plataforma de single-user para multi-gestor com autenticação, preservando toda funcionalidade existente.

### 1.1 Modelo de dados — Novas tabelas

#### `managers` (gestores)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| name | String | Nome completo |
| email | String (unique) | Email de login |
| password_hash | String | Senha hasheada (bcrypt) |
| company | String? | Nome da empresa/agência |
| role | Enum (`admin`, `manager`, `agency`) | Perfil de acesso |
| plan | String (default: `"pro"`) | Plano do gestor |
| max_clients | Int? (default: `null`) | Limite de clientes (null = ilimitado) |
| agency_id | String? (FK → managers.id) | Gestor dono da agência (self-ref) |
| max_seats | Int? | Limite de membros da equipe (agency) |
| subscription_status | Enum (`active`, `past_due`, `canceled`, `trial`) | Status da assinatura |
| subscription_ends_at | DateTime? | Data de expiração da assinatura |
| billing_period | String? | Período de cobrança |
| active | Boolean (default: `true`) | Conta ativa/inativa |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Última atualização |

#### `invites`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| token | String (unique) | Token criptográfico do convite |
| email | String? | Email do convidado (opcional) |
| plan | String (default: `"pro"`) | Plano atribuído ao novo gestor |
| used | Boolean (default: `false`) | Convite já foi usado? |
| created_by | String (FK → managers.id) | Admin que criou o convite |
| expires_at | DateTime | Data de expiração (default: +7 dias) |
| created_at | DateTime | Data de criação |

#### `manager_clients` (junction N:N)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| manager_id | String (FK → managers.id) | Gestor |
| client_id | String (FK → clients_config.act_id) | Cliente (ad account) |
| created_at | DateTime | Data do vínculo |

**PK composta:** `(manager_id, client_id)`

#### `refresh_tokens`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id) | Gestor |
| token_hash | String (unique) | Hash do refresh token |
| expires_at | DateTime | Data de expiração |
| created_at | DateTime | Data de criação |

### 1.2 Seed do Admin

- Script de seed cria o admin padrão na primeira execução:
  - email: `admin@growthads.com` (configurável via .env)
  - senha: definida via .env (`ADMIN_PASSWORD`)
  - role: `admin`

### 1.3 API — Novas rotas

#### Auth

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/auth/login` | Login (email + senha) → access + refresh tokens | ❌ |
| `POST` | `/auth/register/:token` | Cadastro via convite | ❌ |
| `POST` | `/auth/refresh` | Renovar access token via refresh token | ❌ |
| `POST` | `/auth/logout` | Invalidar refresh token | ✅ |
| `GET` | `/auth/me` | Dados do gestor logado | ✅ |
| `PUT` | `/auth/me` | Atualizar perfil (nome, empresa, senha) | ✅ |

#### Convites (Admin apenas)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/invites` | Criar convite (define plano) | Admin |
| `GET` | `/invites` | Listar convites | Admin |
| `DELETE` | `/invites/:id` | Revogar convite | Admin |
| `GET` | `/invites/:token/verify` | Verificar se convite é válido | ❌ |

#### Gestores (Admin apenas)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/managers` | Listar todos os gestores | Admin |
| `GET` | `/managers/:id` | Detalhes de um gestor | Admin |
| `PATCH` | `/managers/:id` | Editar gestor (plano, ativo, etc.) | Admin |
| `DELETE` | `/managers/:id` | Desativar gestor (soft delete) | Admin |
| `POST` | `/managers/:id/clients/:actId` | Vincular cliente a gestor | Admin |
| `DELETE` | `/managers/:id/clients/:actId` | Desvincular cliente de gestor | Admin |

### 1.4 Middleware

- **`authMiddleware`:** Verifica JWT em todas as rotas protegidas. Adiciona `req.manager` (id, role).
- **`adminOnly`:** Verifica se `req.manager.role === 'admin'`. Usado nas rotas de admin.
- **`clientAccessMiddleware`:** Verifica se o gestor logado tem acesso ao cliente solicitado (via `manager_clients`). Admin bypass.

### 1.5 Modificações em rotas existentes

Todas as rotas existentes recebem filtro por gestor:

| Rota | Mudança |
|------|---------|
| `GET /clients` | Retorna apenas clientes do gestor logado. Admin vê todos. |
| `POST /clients` | Cliente é vinculado automaticamente ao gestor logado. |
| `GET /clients/metrics` | Métricas apenas dos clientes do gestor. |
| `GET /clients/:actId/download` | Verifica se gestor tem acesso ao cliente. |
| `DELETE /clients/:actId` | Verifica se gestor tem acesso ao cliente. |
| `POST /sync/manual` | Verifica se gestor tem acesso ao cliente. |
| `POST /sync/breakdown` | Verifica se gestor tem acesso ao cliente. |
| `POST /sync/breakdown/all` | Verifica se gestor tem acesso ao cliente. |
| `GET /sync/progress` | Filtra eventos pelo gestor que disparou. |

### 1.6 Frontend — Novas páginas e componentes

#### Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Login | `/login` | Formulário de login |
| Register | `/register/:token` | Cadastro via convite |
| Admin Dashboard | `/admin` | Visão geral de todos os gestores e clientes |
| Admin Gestores | `/admin/managers` | CRUD de gestores + convites |
| Perfil | `/profile` | Editar perfil e senha |

#### Componentes

| Componente | Descrição |
|------------|-----------|
| `LoginForm.tsx` | Formulário de login (email + senha) |
| `RegisterForm.tsx` | Formulário de cadastro via convite |
| `AdminSidebar.tsx` | Menu lateral com opções de admin |
| `ManagerList.tsx` | Lista de gestores (admin) |
| `InviteForm.tsx` | Formulário para criar convite |
| `InviteList.tsx` | Lista de convites (admin) |
| `ProtectedRoute.tsx` | Wrapper de rota que verifica auth + role |
| `Navbar.tsx` | Atualizado: mostra nome do gestor, badge de notificações, logout |

#### Auth context

- `AuthContext` com React Context API
- Gerencia: user, tokens, login/logout/refresh
- Persiste refresh token em cookie
- Access token em memória (state)
- Auto-refresh antes da expiração
- Redirect para `/login` se não autenticado

### 1.7 Estrutura de arquivos (novos)

```
server/src/
├── controllers/
│   ├── authController.ts        # Login, register, refresh, logout
│   ├── inviteController.ts      # CRUD de convites
│   └── managerController.ts     # CRUD de gestores (admin)
├── middleware/
│   ├── auth.ts                  # authMiddleware (JWT)
│   ├── adminOnly.ts             # Verificação de role admin
│   └── clientAccess.ts          # Verificação de acesso ao cliente
├── repositories/
│   ├── managerRepository.ts     # Queries de gestores
│   ├── inviteRepository.ts      # Queries de convites
│   └── refreshTokenRepository.ts # Queries de refresh tokens
├── routes/
│   ├── authRoutes.ts            # Rotas de autenticação
│   ├── inviteRoutes.ts          # Rotas de convites
│   └── managerRoutes.ts         # Rotas de gestores
├── services/
│   ├── authService.ts           # Lógica de auth (hash, JWT, refresh)
│   └── inviteService.ts         # Lógica de convites (gerar token, validar)

client/src/
├── contexts/
│   └── AuthContext.tsx           # Context de autenticação
├── pages/
│   ├── Login.tsx                # Página de login
│   ├── Register.tsx             # Página de cadastro
│   └── admin/
│       ├── AdminDashboard.tsx   # Dashboard administrativo
│       └── AdminManagers.tsx    # Gestão de gestores e convites
├── components/
│   ├── ProtectedRoute.tsx       # Guarda de rota
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── InviteForm.tsx
│   └── InviteList.tsx
```

---

## Fase 2 — Orçamento e Metas

> **Objetivo:** Permitir que cada gestor defina orçamentos e metas por cliente, com acompanhamento visual.

### 2.1 Modelo de dados — Novas tabelas

#### `client_budgets`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id) | Gestor que definiu |
| client_id | String (FK → clients_config.act_id) | Cliente |
| month | DateTime | Mês de referência (armazenado como primeiro dia) |
| budget_amount | Decimal | Valor planejado (ex: 5000.00) |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Última atualização |

**Unique:** `(manager_id, client_id, month)`

#### `client_goals`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id) | Gestor que definiu |
| client_id | String (FK → clients_config.act_id) | Cliente |
| metric | Enum | Métrica: `leads`, `cpl`, `roas`, `ctr`, `clicks`, `impressions`, `purchases`, `purchase_value` |
| target_value | Decimal | Valor alvo |
| period | Enum (`monthly`) | Período (mensal por enquanto) |
| month | DateTime | Mês de referência |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Última atualização |

**Unique:** `(manager_id, client_id, metric, month)`

### 2.2 API — Novas rotas

#### Orçamentos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/clients/:actId/budget` | Orçamento do mês atual (do gestor logado) |
| `POST/PUT` | `/clients/:actId/budget` | Criar/atualizar orçamento |
| `GET` | `/clients/:actId/budget/history` | Histórico de orçamentos |

#### Metas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/clients/:actId/goals` | Metas do mês atual |
| `POST/PUT` | `/clients/:actId/goals` | Criar/atualizar meta |
| `DELETE` | `/clients/:actId/goals/:id` | Remover meta |

### 2.3 Frontend — Componentes

| Componente | Descrição |
|------------|-----------|
| `BudgetCard.tsx` | Exibe orçamento, % investido, barra de progresso |
| `BudgetForm.tsx` | Formulário para definir/editar orçamento mensal |
| `GoalCard.tsx` | Exibe meta vs atual, indicador visual (verde/amarelo/vermelho) |
| `GoalForm.tsx` | Formulário para definir metas por métrica |
| `ClientOverview.tsx` | Seção no card do cliente com orçamento + metas |

### 2.4 Modificações no Dashboard

- Cards de métricas agora comparam com metas (quando definidas)
- Indicador visual de performance vs meta
- Seção de orçamento: investimento atual vs planejado

---

## Fase 3 — Alertas e Notificações

> **Objetivo:** Sistema de alertas automáticos baseado em orçamento, metas e sync.

### 3.1 Modelo de dados — Nova tabela

#### `alerts`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id) | Gestor destinatário |
| client_id | String (FK → clients_config.act_id) | Cliente relacionado |
| type | Enum | Tipo: `budget_warning`, `budget_exceeded`, `budget_underuse`, `goal_behind`, `goal_reached`, `sync_failed`, `sync_success`, `account_issue`, `balance_low` |
| severity | Enum (`info`, `warning`, `critical`, `success`) | Severidade |
| title | String | Título curto |
| message | String | Descrição detalhada |
| read | Boolean (default: `false`) | Lido pelo gestor |
| dismissed | Boolean (default: `false`) | Descartado |
| created_at | DateTime | Data de criação |

### 3.2 Serviço de alertas

- `alertService.ts` — Avalia condições e gera alertas após cada sync
- Regras de dedup: não criar alerta duplicado para o mesmo tipo + cliente + mês
- Integração com `syncService.ts`: após sync completo, chama `alertService.evaluate(clientId, managerId)`

### 3.3 API — Novas rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/alerts` | Listar alertas do gestor (não lidos primeiro) |
| `GET` | `/alerts/count` | Contagem de alertas não lidos |
| `PATCH` | `/alerts/:id/read` | Marcar como lido |
| `PATCH` | `/alerts/read-all` | Marcar todos como lidos |
| `DELETE` | `/alerts/:id` | Descartar alerta |

### 3.4 Frontend — Componentes

| Componente | Descrição |
|------------|-----------|
| `AlertBadge.tsx` | Badge no navbar com contagem de alertas não lidos |
| `AlertDropdown.tsx` | Dropdown com lista de alertas recentes |
| `AlertList.tsx` | Página completa de alertas com filtros |
| `AlertItem.tsx` | Item de alerta com ícone de severidade e ação |

### 3.5 Notificações por email (futuro)

- Configuração por gestor: quais tipos de alerta enviam email
- Template de email com dados do alerta
- Integração com serviço de email (Resend, SendGrid, etc.)

---

## Fase 4 — Kanban de Tarefas

> **Objetivo:** Permitir que cada gestor gerencie suas tarefas diárias (revisar campanha, ajustar orçamento, criar criativo, etc.) com visualização Kanban.

### 4.1 Modelo de dados — Nova tabela

#### `tasks`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id) | Gestor dono da tarefa |
| client_id | String? (FK → clients_config.act_id) | Cliente vinculado (opcional) |
| title | String | Título da tarefa |
| description | String? | Descrição detalhada |
| status | Enum | `backlog`, `todo`, `in_progress`, `review`, `done` |
| priority | Enum | `low`, `medium`, `high`, `urgent` |
| due_date | DateTime? | Data de vencimento |
| position | Int | Posição dentro da coluna (para ordenação) |
| alert_id | String? (FK → alerts.id) | Alerta que gerou esta tarefa (auto-criada) |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Última atualização |

### 4.2 API — Novas rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/tasks` | Listar tarefas do gestor (filtros: status, client_id, priority) |
| `POST` | `/tasks` | Criar tarefa |
| `GET` | `/tasks/:id` | Detalhes da tarefa |
| `PUT` | `/tasks/:id` | Atualizar tarefa |
| `DELETE` | `/tasks/:id` | Excluir tarefa |
| `PATCH` | `/tasks/:id/status` | Mover tarefa para outra coluna |
| `PATCH` | `/tasks/reorder` | Reordenar posições após drag-and-drop |

### 4.3 Frontend — Componentes

| Componente | Descrição |
|------------|-----------|
| `TaskBoard.tsx` | Board Kanban com 5 colunas |
| `TaskColumn.tsx` | Coluna do Kanban (backlog, todo, etc.) |
| `TaskCard.tsx` | Card de tarefa arrastável |
| `TaskForm.tsx` | Formulário criar/editar tarefa |
| `TaskFilters.tsx` | Filtros por cliente, prioridade, data |

### 4.4 Tarefas automáticas

Quando um alerta é gerado, o sistema pode criar uma tarefa automaticamente:
- `sync_failed` → "Verificar sync de [Cliente]" (prioridade: high)
- `budget_exceeded` → "Revisar orçamento de [Cliente]" (prioridade: urgent)
- `goal_behind` → "Otimizar performance de [Cliente]" (prioridade: medium)

Configurável por gestor: quais alertas geram tarefas automáticas.

### 4.5 Bibliotecas

- `@dnd-kit/core` + `@dnd-kit/sortable` — Drag and drop das tarefas entre colunas

---

## Fase 5 — WhatsApp via Evolution API

> **Objetivo:** Integrar WhatsApp para notificar gestores e enviar relatórios para clientes.

### 5.1 Integração com Evolution API

- Evolution API rodando como serviço externo (Docker)
- Comunicação via REST (HTTP)
- Instância única da plataforma gerencia múltiplas conexões WhatsApp (uma por gestor)
- Endpoint base: configurável via `.env` (`EVOLUTION_API_URL`)

### 5.2 Modelo de dados — Novas tabelas

#### `whatsapp_connections`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id, unique) | Gestor dono da conexão |
| instance_name | String | Nome da instância na Evolution API |
| phone_number | String | Número do WhatsApp conectado |
| status | Enum (`disconnected`, `connecting`, `connected`, `failed`) | Status da conexão |
| qr_code | String? | QR code base64 para escaneamento |
| connected_at | DateTime? | Data da última conexão |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Última atualização |

#### `whatsapp_contacts`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id) | Gestor dono |
| client_id | String? (FK → clients_config.act_id) | Cliente vinculado (opcional) |
| name | String | Nome do contato |
| phone_number | String | Número do WhatsApp |
| role | Enum (`client`, `team`, `other`) | Tipo de contato |
| created_at | DateTime | Data de criação |

#### `whatsapp_messages`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| manager_id | String (FK → managers.id) | Gestor que enviou |
| contact_id | String (FK → whatsapp_contacts.id) | Destinatário |
| client_id | String? (FK → clients_config.act_id) | Cliente relacionado (opcional) |
| template_key | String | Chave do template usado |
| content | String | Conteúdo da mensagem enviada |
| status | Enum (`pending`, `sent`, `delivered`, `read`, `failed`) | Status de entrega |
| scheduled_at | DateTime? | Agendamento (null = envio imediato) |
| sent_at | DateTime? | Data de envio |
| error | String? | Mensagem de erro (se falhou) |
| created_at | DateTime | Data de criação |

### 5.3 Funcionalidade A — Notificar o Gestor

O gestor conecta seu WhatsApp e recebe notificações automáticas:

| Evento | Template de mensagem |
|--------|---------------------|
| `budget_warning` | "⚠️ [Cliente]: Investimento atingiu {percent}% do orçamento ({spent} de {budget})" |
| `budget_exceeded` | "🚨 [Cliente]: Orçamento estourado! Investido {spent} de {budget}" |
| `sync_failed` | "❌ Falha no sync de [Cliente]. Verifique o token ou a conta." |
| `goal_reached` | "🎯 Meta atingida! [Cliente] — {metric}: {value}" |
| `resumo_diario` | "📊 Resumo diário:\n{lista de clientes com spend, leads, cpl}" |

Configurável por gestor: quais eventos notificam via WhatsApp.

### 5.4 Funcionalidade B — Relatórios para Clientes

O gestor cadastra os números dos clientes e envia resumos:

| Template | Conteúdo |
|----------|----------|
| `resumo_semanal` | "📊 *Relatório Semanal — {Cliente}*\n💰 Investimento: R$ X\n🎯 Leads: Y\n📈 CPL: R$ Z\n📊 ROAS: W" |
| `resumo_mensal` | Relatório mensal completo com comparação mês anterior |

O gestor pode:
- Enviar manualmente (botão "Enviar WhatsApp" no card do cliente)
- Agendar envio automático (ex: toda segunda às 9h)

### 5.5 API — Novas rotas

#### WhatsApp Connections

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/whatsapp/connect` | Iniciar conexão (criar instância na Evolution) |
| `GET` | `/whatsapp/status` | Status da conexão do gestor |
| `GET` | `/whatsapp/qr` | Obter QR code para escaneamento |
| `POST` | `/whatsapp/disconnect` | Desconectar WhatsApp |
| `POST` | `/whatsapp/webhook` | Webhook recebido da Evolution API |

#### WhatsApp Contacts

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/whatsapp/contacts` | Listar contatos do gestor |
| `POST` | `/whatsapp/contacts` | Cadastrar contato |
| `PUT` | `/whatsapp/contacts/:id` | Editar contato |
| `DELETE` | `/whatsapp/contacts/:id` | Remover contato |

#### WhatsApp Messages

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/whatsapp/messages` | Listar mensagens enviadas |
| `POST` | `/whatsapp/messages/send` | Enviar mensagem imediata |
| `POST` | `/whatsapp/messages/schedule` | Agendar mensagem |
| `POST` | `/whatsapp/messages/report/:actId` | Enviar relatório de cliente |
| `DELETE` | `/whatsapp/messages/:id` | Cancelar mensagem agendada |

#### WhatsApp Settings

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/whatsapp/settings` | Configurações de notificação do gestor |
| `PUT` | `/whatsapp/settings` | Atualizar quais eventos notificam via WhatsApp |

### 5.6 Frontend — Componentes

| Componente | Descrição |
|------------|-----------|
| `WhatsAppStatus.tsx` | Card com status da conexão (conectado/desconectado) |
| `QRCodeModal.tsx` | Modal com QR code para conectar WhatsApp |
| `ContactList.tsx` | Lista de contatos cadastrados |
| `ContactForm.tsx` | Formulário para cadastrar contato |
| `MessageHistory.tsx` | Histórico de mensagens enviadas |
| `SendReportModal.tsx` | Modal para enviar relatório por WhatsApp |
| `WhatsAppSettings.tsx` | Configurar quais eventos notificam |

### 5.7 Arquitetura Evolution API

```
Growth Ads API  →  HTTP REST  →  Evolution API (Docker)  →  WhatsApp Web
                      ↕
                  Webhooks (eventos de entrega)
```

- A Evolution API roda em container separado (adicionar ao docker-compose)
- Cada gestor tem sua instância nomeada (ex: `manager_{uuid}`)
- Webhook da Evolution notifica status de entrega (sent, delivered, read)
- Rate limiting: intervalo mínimo de 5s entre mensagens para evitar bloqueio

### 5.8 Agente IA (Futuro — Sprint 7)

Evolução do WhatsApp com inteligência artificial:

- **Resumos inteligentes:** LLM gera resumo diário/semanal com insights ("Cliente X subiu 20% em leads, mas CPL piorou. Verificar criativo Y.")
- **Sugestões automáticas:** "Considere pausar o anúncio Z que tem CPL R$ 150 acima da meta"
- **Chatbot:** Gestor pergunta no WhatsApp "Como está o cliente X?" e recebe resposta instantânea
- **Implementação:** Pode ser via n8n (fluxos visuais) ou código nativo (OpenAI/Anthropic API)

---

## Resumo de Impacto no Banco de Dados

### Novas tabelas (Prisma models)

```
Fase 1 — Auth:
  Manager       → managers
  Invite        → invites
  ManagerClient → manager_clients (junction)
  RefreshToken  → refresh_tokens

Fase 2 — Orçamento/Metas:
  ClientBudget  → client_budgets
  ClientGoal    → client_goals

Fase 3 — Alertas:
  Alert         → alerts

Fase 4 — Kanban:
  Task          → tasks

Fase 5 — WhatsApp:
  WhatsappConnection → whatsapp_connections
  WhatsappContact    → whatsapp_contacts
  WhatsappMessage    → whatsapp_messages
```

### Tabelas existentes (sem mudança)

```
clients_config          → Sem mudança de schema
meta_ads_performance    → Sem mudança
ad_audience_performance → Sem mudança
ad_placement_performance→ Sem mudança
ad_region_performance   → Sem mudança
app_settings            → Sem mudança
```

### View para BI (opcional)

```sql
CREATE VIEW v_performance_complete AS
SELECT
  p.*,
  c.name AS client_name,
  c.act_id,
  m.id AS manager_id,
  m.name AS manager_name,
  m.company AS manager_company
FROM meta_ads_performance p
JOIN clients_config c ON p.client_id = c.act_id
JOIN manager_clients mc ON c.act_id = mc.client_id
JOIN managers m ON mc.manager_id = m.id;
```

---

## Ordem de Implementação

### Sprint 1 — Auth e Multi-Tenancy (Fase 1) [CONCLUIDA]
1. ~~Models Prisma (Manager, Invite, ManagerClient, RefreshToken)~~
2. ~~Auth service (hash, JWT, refresh)~~
3. ~~Auth middleware~~
4. ~~Rotas de auth (login, register, refresh, logout)~~
5. ~~Rotas de convites (admin)~~
6. ~~Rotas de gestores (admin)~~
7. ~~ClientAccess middleware + filtro em rotas existentes~~
8. ~~Seed do admin~~
9. ~~Frontend: Login, Register, AuthContext, ProtectedRoute~~
10. ~~Frontend: Admin pages (dashboard, managers, invites)~~
11. ~~Frontend: Atualizar rotas existentes com auth~~

### Sprint 2 — Orçamento e Metas (Fase 2) [CONCLUIDA]
1. ~~Models Prisma (ClientBudget, ClientGoal)~~
2. ~~Repositories~~
3. ~~Services (budget, goals)~~
4. ~~Rotas API~~
5. ~~Frontend: BudgetCard, GoalCard, formulários~~
6. ~~Dashboard atualizado com metas e orçamento~~

### Sprint 3 — Alertas (Fase 3) [CONCLUIDA]
1. ~~Model Prisma (Alert)~~
2. ~~AlertService (avaliação pós-sync)~~
3. ~~Rotas API~~
4. ~~Frontend: AlertBadge, AlertDropdown, AlertList~~
5. ~~Integração com sync existente~~
6. (Futuro) Notificações por email

### Sprint 4 — Kanban de Tarefas (Fase 4) [CONCLUIDA]
1. ~~Models Prisma (Task)~~
2. ~~Repositories + Services~~
3. ~~Rotas API (CRUD + reorder)~~
4. ~~Frontend: Board Kanban com @dnd-kit~~
5. ~~Integração com alertas (criar tarefa automática)~~
6. ~~Filtros por cliente e prioridade~~

### Sprint 5 — Notificações WhatsApp (Evo API) [CONCLUIDA]
1. ~~Configuração Evolution API (.env + config service)~~
2. ~~Lógica de envio de mensagens (alertService + evoService)~~
3. ~~Status de conexão da instância no dashboard/configurações~~
4. ~~Seleção de horários para checagem de saúde (08:00, 12:00, 18:00)~~
5. ~~Envio de resumos semanais automáticos para gestores~~
6. ~~Indicadores visuais de saúde da conta (Ativa, Desativada, Erro de Pagamento)~~

#### Resumo Semanal Enriquecido

O resumo semanal (`sendSummaryToManager`) inclui:
- **Comparativo período a período**: variação % de investimento, leads, CPL e ROAS vs semana anterior
- **Indicadores de tendência**: setas ↑↓ com percentual de variação
- **Desempenho por cliente**: investimento, leads, CPL, ROAS, mensagens com delta vs semana anterior
- **Alertas de orçamento**: clientes que atingiram ≥80% do orçamento são destacados no resumo
- **Top performers**: ranking dos 3 melhores clientes da semana (por investimento)
- **Alertas pendentes**: contagem de alertas não lidos do gestor
- Execução automática toda segunda-feira às 09:00 (horário de Brasília)

### Sprint 6 — Monetização [CONCLUIDA]
1. ~~Configuração centralizada de planos (`plans.ts`) — Starter, Pro, Agency~~
2. ~~Feature gating via middleware (`planMiddleware.ts`) — limites de clientes, tarefas, seats, features~~
3. ~~Plano Agency com gerenciamento de equipe (multi-tenancy via `agencyId`)~~
4. ~~Rotas de planos (listar, atual, trocar com proteção de downgrade)~~
5. ~~Rotas de agency (membros, convite, remoção, visão consolidada)~~
6. ~~Proteção de downgrade (bloqueia se uso atual excede limites do novo plano)~~
7. ~~Frontend: Página de Planos com comparação e seletor de período de cobrança~~
8. ~~Frontend: Página Agency com gestão de equipe e visão consolidada~~
9. ~~Navegação baseada em role (admin vê tudo, agency vê Equipe, manager vê base)~~

#### Planos e Preços

| Plano | Mensal | Trimestral (5% off) | Semestral (10% off) | Anual (15% off) |
|-------|--------|---------------------|---------------------|-----------------|
| **Starter** | R$ 97 | R$ 92 | R$ 87 | R$ 82 |
| **Pro** | R$ 197 | R$ 187 | R$ 177 | R$ 167 |
| **Agency** | R$ 397 | R$ 377 | R$ 357 | R$ 337 |

#### Features por Plano

| Feature | Starter | Pro | Agency |
|---------|---------|-----|--------|
| Clientes máx. | 5 | 20 | Ilimitado |
| Tarefas máx. | 25 | 100 | Ilimitado |
| Seats (equipe) | — | — | 10 (padrão) |
| Auto Sync | ✗ | ✓ | ✓ |
| Orçamento e Metas | ✗ | ✓ | ✓ |
| WhatsApp | ✗ | ✓ | ✓ |
| Exportar Excel | ✗ | ✓ | ✓ |
| Resumo Semanal | ✗ | ✓ | ✓ |
| Dashboard Consolidado | ✗ | ✗ | ✓ |
| Gestão de Equipe | ✗ | ✗ | ✓ |
| Health Check | ✗ | ✗ | ✓ |

#### Modelo de dados — Alterações no Manager

| Campo | Tipo | Descrição |
|-------|------|-----------|
| role | Enum (`admin`, `manager`, `agency`) | Novo role `agency` |
| agency_id | String? (FK → managers.id) | Gestor dono da agência (self-ref) |
| max_seats | Int? | Limite de membros da equipe |
| subscription_status | Enum (`active`, `past_due`, `canceled`, `trial`) | Status da assinatura |
| subscription_ends_at | DateTime? | Data de expiração da assinatura |
| billing_period | String? | Período de cobrança (`monthly`, `quarterly`, `semiannual`, `annual`) |

#### API — Rotas de Planos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/plans` | Listar todos os planos com preços | ❌ |
| `GET` | `/plans/current` | Plano atual do gestor + uso + status assinatura | ✅ |
| `POST` | `/plans/change` | Trocar plano (com proteção de downgrade) | ✅ |

#### API — Rotas de Agency

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/agency/members` | Listar membros da equipe | Agency |
| `POST` | `/agency/members` | Convidar membro (verifica seat limit) | Agency |
| `DELETE` | `/agency/members/:memberId` | Remover membro | Agency |
| `GET` | `/agency/consolidated` | Visão consolidada de todos os gestores e clientes | Agency |

#### Middleware de Feature Gating

- `requireFeature(feature)` — Bloqueia acesso se plano não tem a feature (403 `PLAN_LIMIT`)
- `checkClientLimit()` — Bloqueia criação de cliente se exceder limite (403 `CLIENT_LIMIT`)
- `checkTaskLimit()` — Bloqueia criação de tarefa se exceder limite (403 `TASK_LIMIT`)
- `checkSeatLimit()` — Bloqueia convite de membro se exceder seats (403 `SEAT_LIMIT`)
- `requireAgencyRole()` — Bloqueia acesso se não for agency (403 `AGENCY_ONLY`)

#### Frontend — Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Planos | `/plans` | Comparação de planos, preços, seletor de período, plano atual destacado |
| Agency | `/agency` | Gestão de equipe (convite/remoção), visão consolidada dos clientes |

#### Navegação por Role

| Item | Manager | Agency | Admin |
|------|---------|--------|-------|
| Planos | ✓ | ✓ | ✓ |
| Gestores | ✗ | ✗ | ✓ |
| Convites | ✗ | ✗ | ✓ |
| Equipe | ✗ | ✓ | ✓ |

### Sprint 7 — Agente IA (Futuro)
1. Resumos inteligentes diários/semanais (LLM)
2. Integração com n8n ou código nativo
3. Sugestões automáticas de otimização
4. Chatbot no WhatsApp do gestor

### Sprint 8 — Integração direta com Meta (Futuro)
1. OAuth com Meta Business Suite — gestor autentica com sua conta Meta
2. Listar automaticamente as contas de anúncio (ad accounts) vinculadas ao gestor
3. Cadastro automático de clientes ao conectar a conta — sem preenchimento manual
4. Sincronização bidirecional: alterações na plataforma refletem no Meta e vice-versa
5. Permissões granulares via Meta Marketing API (leitura de métricas, sem acesso a edição de campanhas)

### Sprint 9 — Projeção de Meta + Status da Conta

> **Objetivo:** Adicionar projeção inteligente de metas baseada em média diária e exibir o status real da conta de ads no dashboard.

#### 9.1 Projeção de Meta

- Baseado na média diária (janela configurável: 7d, 14d, 30d), projetar se a meta mensal será atingida
- Exibir dois números:
  - **Ritmo atual:** "Projeção de X leads/mês neste ritmo"
  - **Necessário:** "Precisa de Y leads/dia para atingir a meta"
- Gráfico de **burndown** — linha da meta vs. linha real acumulada ao longo do mês
- Base já existe: `dailyMetrics` no dashboard + sistema de metas (`GoalCard`)
- Disclaimer sutil: "Baseado na média dos últimos N dias"
- Janela de média configurável pelo gestor (7d, 14d, 30d)

#### 9.2 Status da Conta

- Exibir `accountStatus` no card do cliente e no dashboard:
  - 1 = Ativa (verde)
  - 2 = Desativada (vermelho)
  - 3 = Pendência de pagamento (amarelo)
  - 7 = Em análise (amarelo)
  - 9 = Grace Period (laranja)
- Já existe `renderHealthBadge` no `ClientCard.tsx`
- Necessário: cron periódico para atualizar o status (via Meta API)
- Mostrar **data/hora da última verificação** para evitar falsos alertas
- Notificação via WhatsApp quando status mudar para algo crítico (desativada, pendência)

#### API — Novas rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/clients/:actId/status` | Status atual da conta + última verificação |
| `POST` | `/clients/:actId/status/refresh` | Forçar verificação do status agora |

#### Frontend — Componentes

| Componente | Descrição |
|------------|-----------|
| `GoalProjection.tsx` | Card com projeção de meta, ritmo atual vs necessário, gráfico burndown |
| `AccountStatusBadge.tsx` | Badge com status da conta (cor + ícone + label) |
| `BurndownChart.tsx` | Gráfico de linha: meta acumulada vs real acumulada por dia do mês |

#### Considerações

- Status muda com frequência e não é 100% confiável em tempo real
- Sem data/hora da verificação pode gerar pânico desnecessário
- Consumo adicional de chamadas da Meta API para polling de status

---

### Sprint 10 — Alerta de Saldo Baixo (Boleto)

> **Objetivo:** Monitorar o saldo da conta de ads e alertar o gestor/cliente quando estiver baixo, especialmente para contas com pagamento via boleto (recarga manual).

#### 10.1 Funcionalidades

- Monitorar saldo da conta de ads via Meta API (`spend_cap` e `balance`)
- Campo no cadastro do cliente: **"Essa conta é boleto?"** (flag `is_boleto`)
- Limiar de alerta **configurável por cliente**: "Alertar quando saldo < R$ X"
- Alerta via WhatsApp + registro no banco de dados (tipo `balance_low`)
- Badge visual no dashboard quando saldo está baixo
- Cálculo de saldo correto: contas com `spend_cap` usam `spend_cap - amount_spent`; contas sem `spend_cap` usam o campo `balance` da API (saldo restante pré-pago, sem subtrair `amount_spent`)

#### 10.2 Modelo de dados — Alterações no Client

| Campo | Tipo | Descrição |
|-------|------|-----------|
| is_boleto | Boolean (default: `false`) | Conta paga por boleto (recarga manual) |
| balance_threshold | Decimal? | Limiar para alerta de saldo baixo (em reais) |
| current_balance | Decimal? | Último saldo conhecido (atualizado via cron) |
| balance_updated_at | DateTime? | Data da última verificação de saldo |

#### 10.3 API — Novas rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/clients/:actId/balance` | Saldo atual da conta |
| `POST` | `/clients/:actId/balance/refresh` | Forçar verificação do saldo |
| `PATCH` | `/clients/:actId/balance-settings` | Configurar is_boleto e threshold |

#### 10.4 Cron de Monitoramento

- Verificar saldo de todas as contas boleto 2x ao dia (8h e 14h)
- Se saldo < threshold → gera alerta `balance_low` via `alertService.onBalanceLow()`
- Alerta é salvo no banco com dedup (mesmo tipo + cliente + mês)
- Alerta `critical` cria tarefa automática no Kanban
- Notificação WhatsApp enviada via `alertService.sendWhatsapp()`

#### Considerações

- Meta não expõe método de pagamento (boleto vs cartão) pela API — precisa ser manual
- Saldo via API pode ter delay ou não refletir créditos pendentes de compensação
- Precisa do scope `ads_management` (mais permissivo que `ads_read`)
- Definir "saldo baixo" é relativo — R$ 100 é pouco pra conta de R$ 50k/mês mas muito pra R$ 500/mês

---

### Sprint 11 — Rastreamento de Vendas WhatsApp (CTWA + Evolution API)

> **Objetivo:** Rastrear vendas originadas de anúncios com Click-to-WhatsApp (CTWA), permitindo fechar o funil (impressão → clique → conversa → venda → revenue) e enviar conversões para o Pixel/Conversions API do cliente.

#### 11.1 Visão Geral do Funil

```
Anúncio CTWA → Clique no WhatsApp → Abre conversa → Atendimento → Venda
      ↓              ↓                    ↓                          ↓
   Meta Ads     Evolution API        Matching UTM/fbclid      Conversions API
   (impression)  (webhook)           → anúncio origem          (Purchase event)
```

#### 11.2 Fases de Implementação

##### Fase 1 — MVP de Validação (1-2 semanas)

- Conectar **1 cliente piloto** na Evolution API
- Monitorar: "quantas conversas abriram pelo anúncio CTWA"
- Comparar com `messaging` dos relatórios do Meta
- **Não criar bot, não registrar venda, não enviar para Pixel**
- Objetivo: validar que o rastreamento de origem funciona

##### Fase 2 — Matching CTWA + Webhooks

- Webhook de recebimento de mensagem na Evolution API
- Matching CTWA: capturar `fbclid` ou UTM da primeira mensagem
- Associar conversa → anúncio de origem → campanha
- Evolution API com multi-instância (1 instância por número WhatsApp)
- Infra: VPS 8GB (R$ 80-120/mês) suporta ~80-100 instâncias com Cloud API do Meta

##### Fase 3 — Bot de Registro de Venda

- Fluxo simples via WhatsApp:
  1. Atendente responde "qual o valor da venda?" → Bot pergunta valor
  2. Atendente responde "R$ 350" → Bot registra venda de R$ 350
  3. Confirmação automática
- Registro armazenado no banco com vinculo à conversa → anúncio → campanha
- Alternativa: botão simples no dashboard para registrar venda manualmente

##### Fase 4 — Conversions API + Dashboard de Attribution

- Enviar evento `Purchase` para o Pixel/Conversions API do cliente
- Formato do evento: `event_name: "Purchase"`, `value`, `currency: "BRL"`, `fbclid`
- Dashboard de attribution: funil completo (impressão → clique → conversa → venda → revenue)
- Métricas: taxa de conversão WhatsApp, ticket médio, ROAS real, custo por venda efetiva

#### 11.3 Modelo de dados — Novas tabelas

##### `whatsapp_instances` (extensão da tabela existente)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| client_id | String? (FK → clients_config.act_id) | Cliente vinculado a esta instância |
| fb_pixel_id | String? | Pixel ID do cliente para Conversions API |
| fb_access_token | String? | Access token do Conversions API do cliente |
| tracking_enabled | Boolean (default: `false`) | Rastreamento CTWA ativo |

##### `ctwa_conversations`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| instance_id | String (FK → whatsapp_instances.id) | Instância WhatsApp |
| contact_phone | String | Número do contato |
| fbclid | String? | Facebook Click ID (do anúncio) |
| utm_source | String? | UTM source |
| utm_campaign | String? | UTM campaign |
| utm_content | String? | UTM content (ad id) |
| ad_id | String? | ID do anúncio de origem (resolvido via fbclid) |
| campaign_name | String? | Nome da campanha (resolvido via fbclid) |
| first_message_at | DateTime | Primeira mensagem recebida |
| last_message_at | DateTime | Última mensagem |
| message_count | Int | Total de mensagens trocadas |
| status | Enum (`open`, `closed`, `converted`) | Status da conversa |
| created_at | DateTime | Data de criação |

##### `ctwa_sales`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| conversation_id | String (FK → ctwa_conversations.id) | Conversa originadora |
| client_id | String (FK → clients_config.act_id) | Cliente |
| amount | Decimal | Valor da venda |
| description | String? | Descrição/produtos |
| registered_by | Enum (`whatsapp_bot`, `dashboard_manual`) | Como foi registrada |
| conversion_sent | Boolean (default: `false`) | Evento enviado ao Pixel? |
| conversion_sent_at | DateTime? | Data do envio ao Pixel |
| created_at | DateTime | Data de criação |

#### 11.4 API — Novas rotas

##### CTWA Conversations

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/ctwa/conversations` | Listar conversas (filtros: client, status, date) |
| `GET` | `/ctwa/conversations/:id` | Detalhes da conversa + mensagens |
| `PATCH` | `/ctwa/conversations/:id/status` | Atualizar status da conversa |

##### CTWA Sales

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/ctwa/sales` | Listar vendas (filtros: client, date) |
| `POST` | `/ctwa/sales` | Registrar venda manual |
| `GET` | `/ctwa/sales/attribution` | Dashboard de attribution (funil completo) |
| `POST` | `/ctwa/sales/:id/send-conversion` | Enviar evento Purchase ao Pixel |

##### CTWA Settings

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/ctwa/settings/:actId` | Configurações de tracking do cliente |
| `PUT` | `/ctwa/settings/:actId` | Configurar Pixel ID, token, tracking |

##### Webhook Evolution API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/webhooks/evolution/messages-upsert` | Receber mensagens da Evolution API |
| `POST` | `/webhooks/evolution/connection-update` | Status de conexão da instância |

#### 11.5 Frontend — Componentes

| Componente | Descrição |
|------------|-----------|
| `CTWASettings.tsx` | Configuração de tracking por cliente (Pixel ID, token) |
| `SalesDashboard.tsx` | Dashboard de attribution: funil completo, ROAS real, receita |
| `SalesList.tsx` | Lista de vendas registradas com filtros |
| `SaleRegisterModal.tsx` | Modal para registro manual de venda |
| `ConversationList.tsx` | Lista de conversas WhatsApp originadas de anúncios |
| `FunnelChart.tsx` | Gráfico de funil: impressão → clique → conversa → venda |

#### 11.6 Custos

| Item | Custo |
|------|-------|
| Desenvolvimento (todas as fases) | 105-140h |
| VPS 8GB para Evolution API | R$ 80-120/mês |
| Custo por instância WhatsApp | ~R$ 1-2/mês de servidor |
| Cloud API do Meta (conversa iniciada pelo usuário) | Grátis na janela de 24h |
| Cloud API do Meta (conversa iniciada por você) | ~R$ 0,06-0,15/conversa |
| Onboarding por cliente (config BM, app, webhook) | 1-2h/cliente |
| Manutenção mensal | 2-6h/mês |

#### 11.7 Riscos

| Risco | Mitigação |
|-------|-----------|
| Matching impreciso (fbclid não chega limpo) | Usar UTM como fallback; aceitar matching aproximado |
| Burocracia Meta (BM verificado, aprovação app) | Documentar passo-a-passo; oferecer suporte no onboarding |
| Instância desconecta/token expira | Monitoramento automático + alerta + auto-reconnect |
| Cliente não registra vendas | Fluxo o mais simples possível (responder valor no WhatsApp) |
| LGPD (processar dados de conversas) | Termo de uso claro; dados anonimizados para analytics |
| Meta limita conta por eventos mal formatados | Validar formato do evento antes de enviar; batch com delay |

#### Considerações

- **Diferencial competitivo alto** — praticamente nenhuma agência pequena/média tem attribution completo WhatsApp
- Fechar o funil permite otimizar campanhas pelo ROAS real, não só por métricas de topo
- Recomendar começar pela Fase 1 (MVP) para validar viabilidade antes de investir no sistema completo
- **Status: Aguardando decisão sobre implementação**
