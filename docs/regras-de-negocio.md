# Growth Ads — Regras de Negócio

> Documento de referência para todas as regras que governam a plataforma Growth Ads como SaaS para gestores de tráfego.

---

## 1. Glossário

| Termo | Definição |
|-------|-----------|
| **Admin** | Dono da plataforma. Acesso total a todos os dados, gestores e configurações. |
| **Gestor** | Profissional de mídia paga que gerencia contas de anúncio (ad accounts) dos seus clientes. |
| **Cliente** | Conta de anúncio (ad account) do Meta Ads cadastrada na plataforma (ex: `act_123456`). |
| **Convite** | Link/token único gerado pelo Admin para permitir o cadastro de um novo gestor. |
| **Plano** | Categoria do gestor que define limites e funcionalidades (preparado para monetização futura). |
| **Orçamento** | Valor planejado pelo gestor para investir em um cliente em um período (mensal). |
| **Meta** | Objetivo numérico definido pelo gestor para uma métrica específica de um cliente (leads, CPL, ROAS, etc.). |
| **Alerta** | Notificação automática disparada quando uma condição é atendida (orçamento estourado, meta não atingida, sync falhou). |

---

## 2. Perfis e Permissões

### 2.1 Admin (Super Admin)

- Pode criar, editar, desativar e excluir gestores
- Pode criar convites para novos gestores
- Pode visualizar todos os gestores, clientes e dados da plataforma
- Pode acessar métricas globais (dashboard administrativo)
- Pode gerenciar planos e limites
- Pode acessar configurações globais (token global, auto-sync, etc.)
- Pode cadastrar clientes e vincular a gestores
- Pode forçar sync de qualquer cliente

### 2.2 Gestor

- Pode visualizar e gerenciar apenas os clientes vinculados a ele
- Pode cadastrar novos clientes (que ficam vinculados automaticamente a ele)
- Pode configurar tokens por cliente ou usar o token global (se disponível)
- Pode disparar sync manual dos seus clientes
- Pode definir orçamentos e metas para seus clientes
- Pode visualizar dashboard com dados apenas dos seus clientes
- Pode exportar relatórios Excel dos seus clientes
- Pode visualizar e gerenciar seus alertas
- Pode editar seu perfil (nome, empresa, senha)
- **Não pode** visualizar dados de outros gestores
- **Não pode** acessar configurações globais da plataforma
- **Não pode** criar convites

---

## 3. Multi-Tenancy

### 3.1 Modelo de dados

- **Relação N:N** entre Gestores e Clientes (tabela junction `manager_clients`)
- Um cliente pode ser gerenciado por múltiplos gestores (ex: agência com mais de um trafficker)
- Um gestor pode ter múltiplos clientes
- Dados de performance pertencem ao **cliente**, não ao gestor
- Todos os gestores vinculados a um cliente veem os mesmos dados de performance

### 3.2 Isolamento de dados

- Todas as rotas da API (exceto auth) devem filtrar dados pelo gestor logado
- O gestor só enxerga: seus clientes, dados de performance dos seus clientes, seus orçamentos, suas metas, seus alertas
- O admin enxerga: tudo (sem filtro)
- Orçamentos e metas são **por gestor + cliente** — dois gestores do mesmo cliente podem ter metas diferentes

### 3.3 Compatibilidade com Looker/Metabase

- As tabelas de performance **não são alteradas** (mantêm a estrutura denormalizada atual)
- A relação gestor-cliente é feita por JOIN: `AdPerformance → Client → ManagerClient → Manager`
- View materializada opcional para facilitar queries BI:
  ```sql
  CREATE VIEW v_performance_complete AS
  SELECT p.*, c.name AS client_name, m.name AS manager_name, m.id AS manager_id
  FROM meta_ads_performance p
  JOIN clients_config c ON p.client_id = c.act_id
  JOIN manager_clients mc ON c.act_id = mc.client_id
  JOIN managers m ON mc.manager_id = m.id;
  ```
- Looker pode consumir tanto as tabelas raw quanto a view

---

## 4. Autenticação e Acesso

### 4.1 Cadastro de gestores

- Gestores **não** podem se cadastrar livremente
- O admin gera um convite (com plano definido)
- O convite produz um link único com token criptográfico
- O convidado acessa o link e preenche: nome, email, senha, empresa (opcional)
- O convite expira em 7 dias (configurável)
- Cada convite pode ser usado apenas 1 vez
- Após o cadastro, o gestor pode fazer login

### 4.2 Login

- Autenticação por email + senha
- Sessão via JWT (access token + refresh token)
- Access token: válido por 15 minutos
- Refresh token: válido por 7 dias, armazenado em cookie httpOnly
- Logout invalida o refresh token

### 4.3 Segurança

- Senhas armazenadas com hash (bcrypt, salt rounds ≥ 10)
- Rate limiting em rotas de autenticação (5 tentativas por minuto por IP)
- JWT contém: userId, role (admin/manager), expiração
- Middleware de auth em todas as rotas (exceto login e registro)
- Middleware de role para rotas restritas ao admin

---

## 5. Gestão de Clientes

### 5.1 Cadastro

- O gestor cadastra um cliente com: nome, act_id, access_token (opcional), custom_event_id (opcional)
- O cliente é automaticamente vinculado ao gestor que o cadastrou
- O admin pode cadastrar clientes e vincular a qualquer gestor
- O admin pode vincular um cliente existente a outro gestor

### 5.2 Tokens

- Token do cliente: o gestor pode configurar um token específico por cliente
- Token global: configurado apenas pelo admin
- Resolução: token do cliente (trim) || token global (trim)
- Se nenhum token disponível: sync falha com mensagem clara
- O gestor vê se o token do cliente está configurado (mascarado) mas não o valor completo
- O admin pode ver/editar qualquer token

### 5.3 Sync

- O gestor pode disparar sync manual dos seus clientes
- O auto-sync (cron) sincroniza todos os clientes de todos os gestores
- O progresso do sync (SSE) é visível apenas para o gestor que disparou
- O admin pode ver o progresso de qualquer sync

---

## 6. Orçamento

### 6.1 Definição

- O gestor define um orçamento mensal por cliente (ex: R$ 5.000/mês)
- Orçamento é por gestor + cliente + mês — dois gestores podem definir orçamentos diferentes para o mesmo cliente
- O gestor pode definir orçamento para meses futuros

### 6.2 Acompanhamento

- O sistema calcula automaticamente o % do orçamento já investido no mês
- Exibido no dashboard e no card do cliente
- Atualizado a cada sync

### 6.3 Alertas de orçamento

- Alerta quando o investimento atinge 80% do orçamento (warning)
- Alerta quando o investimento ultrapassa 100% do orçamento (critical)
- Alerta quando o investimento está abaixo de 50% e o mês está pela metade (underperformance)

---

## 7. Metas

### 7.1 Definição

- O gestor define metas por cliente e por métrica
- Métricas disponíveis para meta: leads, CPL, ROAS,CTR, cliques, impressões, purchases, purchaseValue
- Período da meta: mensal (padrão)
- Meta é por gestor + cliente — cada gestor pode ter metas diferentes

### 7.2 Acompanhamento

- O dashboard compara o valor atual com a meta (barra de progresso ou %)
- Indicador visual: verde (acima da meta), amarelo (próximo), vermelho (abaixo)
- Atualizado a cada sync

### 7.3 Alertas de metas

- Alerta quando uma meta está 20% abaixo do esperado no meio do período
- Alerta quando uma meta é atingida (positivo)

---

## 8. Alertas e Notificações

### 8.1 Tipos de alerta

| Tipo | Gatilho | Severidade |
|------|---------|------------|
| `budget_warning` | Investimento ≥ 80% do orçamento mensal | warning |
| `budget_exceeded` | Investimento > 100% do orçamento mensal | critical |
| `budget_underuse` | Investimento < 50% e mês > 50% decorrido | info |
| `goal_behind` | Meta com performance ≥ 20% abaixo do esperado | warning |
| `goal_reached` | Meta atingida ou ultrapassada | success |
| `sync_failed` | Falha na sincronização de um cliente | critical |
| `sync_success` | Sync completado com sucesso | info |

### 8.2 Canais de notificação

- **In-app:** Badge no menu + lista de notificações não lidas
- **Email:** Enviado para alertas critical e sync_failed (configurável por gestor)
- Futuro: WhatsApp, Telegram, Slack

### 8.3 Regras

- Alertas são gerados automaticamente após cada sync
- Alertas duplicados não são criados (dedup por tipo + cliente + período)
- O gestor pode marcar alertas como lidos
- O admin pode ver alertas de todos os gestores

---

## 9. Planos e Limites (Preparado para o Futuro)

### 9.1 Estrutura

- Campo `plan` na tabela de gestores (default: `"free"`)
- Campo `maxClients` na tabela de gestores (default: `null` = ilimitado)
- Middleware verifica limites antes de permitir cadastro de novo cliente

### 9.2 Planos previstos (valores a definir)

| Plano | Clientes | Gestores por cliente | Funcionalidades |
|-------|----------|---------------------|-----------------|
| Free | 3 | 1 | Dashboard básico, sync manual |
| Pro | 20 | 3 | + Orçamento, metas, alertas, relatórios |
| Premium | Ilimitado | Ilimitado | + API access, notificações avançadas, suporte prioritário |

> **Regra atual:** Todos os gestores têm plano "Pro" com clientes ilimitados até a monetização ser implementada.

---

## 10. Regras Gerais

### 10.1 Dados

- Dados de performance são sempre do cliente (nunca do gestor)
- A exclusão de um gestor **não** exclui seus clientes ou dados de performance
- A exclusão de um gestor remove apenas o vínculo (ManagerClient) e suas metas/orçamentos pessoais
- A exclusão de um cliente (cascade) remove todos os dados de performance daquele cliente

### 10.2 Sync e dados históricos

- O sync sempre faz upsert (nunca duplica dados)
- O gestor pode sincronizar dados históricos (até 37 meses, limite da Meta API)
- Dados de breakdown (público, plataforma, região) seguem as mesmas regras

### 10.3 Auditoria

- Ações sensíveis são logadas: criação de convite, cadastro de gestor, vinculação de cliente, alteração de token, exclusão de dados
- Logs incluem: timestamp, userId, action, details
