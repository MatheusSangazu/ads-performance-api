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
| role | Enum (`admin`, `manager`) | Perfil de acesso |
| plan | String (default: `"pro"`) | Plano do gestor |
| max_clients | Int? (default: `null`) | Limite de clientes (null = ilimitado) |
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
| type | Enum | Tipo: `budget_warning`, `budget_exceeded`, `budget_underuse`, `goal_behind`, `goal_reached`, `sync_failed`, `sync_success` |
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

### Sprint 6 — Monetização (Futuro)
1. Planos e limites
2. Stripe/MercadoPago
3. Billing
4. Feature gating por plano

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
