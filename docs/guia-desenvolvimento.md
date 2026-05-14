# Growth Ads — Guia de Desenvolvimento

> Referência técnica para desenvolvedores e IAs que contribuem com o projeto. Define convenções, padrões e restrições que devem ser seguidas em toda implementação.

---

## 1. Stack e Ferramentas

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js + TypeScript (ESM) | ES2022, strict mode |
| Framework | Express 5 | |
| ORM | Prisma 7 | Output em `server/src/generated/prisma` |
| Banco | MySQL | via `@prisma/adapter-mariadb` |
| Front | React 19 + Vite | |
| Estilo | Tailwind CSS 4 | |
| Gráficos | Recharts | |
| Validação | Zod | Frontend + backend |
| HTTP Client | Axios | |
| Relatórios | ExcelJS | |
| Scheduler | node-cron | |
| Meta API | Graph API v25.0 | |

---

## 2. Estrutura do Projeto

```
growth-ads-api/
├── docs/                     # Documentação (regras, funcionalidades, guia)
├── server/                   # API (código-fonte)
│   ├── src/
│   │   ├── config/           # db.ts (Prisma), env.ts (validação Zod)
│   │   ├── controllers/      # Recebe req/res, chama service, retorna response
│   │   ├── integrations/     # APIs externas (Meta Graph API)
│   │   ├── middleware/       # errorHandler, validate (Zod genérico)
│   │   ├── repositories/     # Queries no banco (Prisma ou raw SQL)
│   │   ├── routes/           # Definição de rotas Express
│   │   ├── services/         # Lógica de negócio
│   │   ├── types/            # Interfaces TypeScript compartilhadas
│   │   └── utils/            # Funções utilitárias puras
│   ├── prisma/               # schema.prisma
│   └── tsconfig.json
│
├── client/                   # Front React
│   └── src/
│       ├── components/       # Componentes React (inclui subpastas ui/)
│       ├── hooks/            # Custom hooks
│       ├── lib/              # api.ts (Axios + tipos), utils
│       └── pages/            # Páginas (Dashboard, Clients, Settings)
│
├── Dockerfile                # Build multi-stage
├── docker-compose.yml
└── package.json              # Scripts raiz (dev, dev:api, dev:client, build)
```

---

## 3. Arquitetura MVC (Server)

O server segue o padrão **Controller → Service → Repository**:

```
Request → Route → Controller → Service → Repository → Database
                                                    ↘ Integração (Meta API)
```

### Responsabilidade de cada camada

| Camada | Responsabilidade | O que NÃO faz |
|--------|-----------------|---------------|
| **Route** | Mapeia método+URL → controller method | Não tem lógica |
| **Controller** | Extrai dados do req, chama service, formata response | Não acessa banco diretamente |
| **Service** | Lógica de negócio, orquestração, validações | Não conhece detalhes de SQL/Prisma |
| **Repository** | Queries no banco (Prisma ou raw SQL) | Não tem lógica de negócio |
| **Integration** | Chamadas HTTP para APIs externas | Não sabe sobre banco nem negócio |
| **Utils** | Funções puras, reutilizáveis, sem efeito colateral | Não acessa banco nem APIs |

### Fluxo de dados

1. **Controller** recebe `req.body` / `req.params`, passa dados tipados ao service
2. **Service** executa lógica, chama repository e/ou integration
3. **Repository** executa query e retorna dados tipados
4. Erros sobem自然mente até o `errorHandler` global

---

## 4. Convenções de Código

### 4.1 TypeScript

- **Strict mode** ativado (`strict: true`, `noImplicitAny: true`)
- **ESM** — imports sempre com extensão `.js` (não `.ts`)
- **Sem `any`** — usar tipos específicos ou `unknown` com type guard
- Tipos compartilhados em `server/src/types/index.ts`
- Interfaces de dados em cada repository (ex: `UpsertInsightData`)

### 4.2 Nomenclatura

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| Arquivos | camelCase | `syncService.ts`, `clientRepository.ts` |
| Classes | PascalCase | `SyncService`, `AdRepository` |
| Métodos | camelCase | `syncAccount()`, `batchUpsert()` |
| Interfaces | PascalCase + prefixo tipo | `UpsertInsightData`, `MetaInsight` |
| Constantes | UPPER_SNAKE_CASE | `META_API_BASE`, `BATCH_SIZE` |
| Enums | PascalCase | `ClientStatus`, `BreakdownType` |
| Rotas (URL) | kebab-case | `/sync/breakdown/all` |
| Colunas DB | snake_case | `ad_name`, `link_clicks` |
| Componentes React | PascalCase | `ClientCard.tsx`, `SyncForm.tsx` |
| Hooks | camelCase + prefixo use | `useClients.ts`, `useSync.ts` |

### 4.3 Exportações

- Cada arquivo exporta uma instância singleton (padrão do projeto):
  ```typescript
  class AdRepository {
    // métodos
  }
  export default new AdRepository();
  ```
- Tipos são exportados como **named exports**:
  ```typescript
  export interface UpsertInsightData { ... }
  ```

### 4.4 Imports

- Ordem: bibliotecas externas → internas (config → repositories → services → types → utils)
- Sempre com extensão `.js` no server:
  ```typescript
  import prisma from '../config/db.js';
  import type { MetaInsight } from '../types/index.js';
  ```

### 4.5 Tratamento de Erros

- Errors são lançados (`throw new Error('mensagem')`) e sobem até o `errorHandler` global
- Em fluxos com resiliência (sync), usar `try/catch` local com contador de erros
- Nunca engolir erros silenciosamente — sempre logar no mínimo
- O `errorHandler` retorna `{ error: string }` com status 500

### 4.6 Assincronia

- Sempre usar `async/await` (nunca `.then()` / `.catch()`)
- `Promise.all` para operações paralelas independentes
- Controlar concorrência com batching (ex: 50 em 50 para preview links)

---

## 5. Convenções de Banco de Dados

### 5.1 Prisma

- Schema em `server/prisma/schema.prisma`
- Gerar client com `cd server && npx prisma generate`
- **Nunca** editar arquivos em `src/generated/` — são auto-gerados
- Campo `id` sempre `@id @default(autoincrement())` (ou `@id` para UUID)
- Mapeamento de nomes com `@map("snake_case")` e `@@map("table_name")`

### 5.2 Raw SQL (batch upsert)

- Usado em `repository.batchUpsert()` para inserção em lote via `INSERT ... ON DUPLICATE KEY UPDATE`
- Placeholder string gerado **dinamicamente** a partir do array de colunas (nunca hardcode `?`):
  ```typescript
  const cols = ['date', 'client_id', 'ad_id', ...];
  const placeholders = `(${cols.map(() => '?').join(',')})`;
  ```
- Chunking automático para respeitar limite de 65.535 placeholders do MySQL:
  ```typescript
  const BATCH_SIZE = Math.floor(65000 / cols.length);
  for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
    const batch = dataList.slice(i, i + BATCH_SIZE);
    // executa INSERT para este lote
  }
  ```
- Garantir sempre: **colunas = placeholders = valores** por registro

### 5.3 Nomes de Tabela

| Tabela | Descrição |
|--------|-----------|
| `clients_config` | Cadastro de clientes |
| `meta_ads_performance` | Performance geral (date + ad_id) |
| `ad_audience_performance` | Por sexo/idade (date + ad_id + gender + age_range) |
| `ad_placement_performance` | Por plataforma (date + ad_id + platform) |
| `ad_region_performance` | Por região (date + ad_id + region) |
| `app_settings` | Key-value store para configurações |

---

## 6. Convenções de API

### 6.1 Estrutura de Rotas

- Prefixo em produção: `/api`
- Rotas agrupadas por recurso:
  - `/api/clients` — CRUD + métricas + download
  - `/api/sync` — Sync manual, breakdowns, SSE progress
  - `/api/settings` — Token global, auto-sync

### 6.2 Padrões de Response

- **Sucesso:** retorna JSON diretamente
  ```json
  { "success": true, "message": "Operação realizada" }
  ```
- **Sucesso com dados:** retorna objeto com dados
  ```json
  { "actId": "act_123", "clientName": "...", ... }
  ```
- **Erro:** status HTTP apropriado + `{ error: "mensagem" }`
  ```json
  { "error": "Cliente não encontrado" }
  ```

### 6.3 Validação

- Input validado com **Zod** quando necessário (middleware `validate`)
- Env vars validadas no startup em `config/env.ts`

### 6.4 SSE (Server-Sent Events)

- `GET /sync/progress` — stream de progresso em tempo real
- Eventos: `start`, `log`, `progress`, `done`, `error`
- Campo `step` identifica a fase (`main`, `audience`, `placement`, `region`)
- Campo `progress` é 0-100 por fase (frontend calcula global)

---

## 7. Convenções de Frontend

### 7.1 Estrutura

- **Páginas** em `client/src/pages/` — containers que montam a tela
- **Componentes** em `client/src/components/` — reutilizáveis e isolados
- **UI básica** em `client/src/components/ui/` — botões, inputs, messages
- **Hooks** em `client/src/hooks/` — lógica de estado e chamadas API
- **API client** em `client/src/lib/api.ts` — Axios instance + funções tipadas

### 7.2 Padrões React

- Functional components com hooks (sem class components)
- Estado local com `useState`, referências com `useRef`
- Chamadas API em hooks customizados (`useClients`, `useSync`, `useDownload`)
- Props tipadas com interfaces no próprio arquivo do componente
- Tailwind para estilos (nunca CSS files)

### 7.3 Feedback Visual

- Feedback Visual

- Loading: ícone `Loader2` com `animate-spin` do lucide-react
- Sucesso/erro: componente `Message` (toast-like)
- Progresso: `SyncProgressModal` com minimização
- Botões desabilitados visualmente com `disabled:opacity-50`
- **Sem emojis** no UI — sempre usar ícones do lucide-react

---

## 8. Token Management

### Regra de resolução de token

A função `resolveToken()` (em `server/src/utils/tokenUtils.ts`) segue esta lógica:

1. Se o cliente tem token **e** existe token global **e** são diferentes:
   - Testa token do cliente com chamada rápida à Meta API
   - Se funciona → usa token do cliente
   - Se falha → usa token global (fallback)
2. Se só tem um dos dois → usa o que tem
3. Se não tem nenhum → lança erro

### Limpar token individual

- `PATCH /clients/:actId/token` com `{ access_token: "" }` faz o cliente usar o global
- Frontend: botão "Usar global" no painel de edição de token do card

---

## 9. Performance e Otimização

### 9.1 Sync

- **Batch upsert** com raw SQL em vez de Prisma `upsert()` individual
- **Preview links em paralelo** com `Promise.all`, lotes de 50, cache em memória
- **Chunking de datas** para períodos longos (split em intervalos de 16 dias)
- **Chunking de SQL** para respeitar limite de placeholders do MySQL

### 9.2 Limites MySQL

- Máximo de 65.535 placeholders por prepared statement
- Cálculo automático do batch size: `Math.floor(65000 / colCount)`
- Nunca inserir mais de ~2500 registros em uma única query raw

---

## 10. Regras para IA e Desenvolvimento

### 10.1 Obrigatório

- **Seguir a arquitetura MVC** — Controller → Service → Repository
- **Sempre rodar `npx tsc --noEmit`** após mudanças no server para verificar tipos
- **Sempre reiniciar o servidor** após mudanças — o tsx watch pode não pegar tudo
- **Tipar tudo** — evitar `any`, preferir tipos específicos
- **Imports com `.js`** no server (ESM)
- **Testar mudanças no banco** — garantir que colunas, placeholders e valores batem
- **Não adicionar comentários** no código a menos que solicitado

### 10.2 Proibido

- ❌ Editar arquivos em `src/generated/` — são auto-gerados pelo Prisma
- ❌ Commitar `.env` ou segredos
- ❌ Usar `any` sem justificativa explícita
- ❌ Usar emojis — no UI usar ícones do lucide-react; em logs usar texto limpo com prefixos
- ❌ Criar arquivos `.css` ou `.scss` — usar Tailwind
- ❌ Acessar banco diretamente no controller — sempre passar por service → repository
- ❌ Hardcode de placeholders em raw SQL — sempre gerar dinamicamente
- ❌ Fazer chamadas sequenciais quando paralelo é possível
- ❌ Criar arquivos de documentação sem solicitação explícita

### 10.3 Boas Práticas

- Preferir **editar** arquivos existentes a **criar** novos
- Ao criar novo repository, seguir o padrão dos existentes (class + singleton export + batchUpsert com chunking)
- Ao criar novo endpoint, seguir o fluxo: route → controller → service → repository
- Ao adicionar colunas no schema, atualizar: Prisma schema → interface → upsert → batchUpsert (cols + flatMap)
- Usar `console.log` com emojis para logs legíveis (🚀 ✅ ❌ 🔑 ⏳ 📥 💾 🔗 🏁)
- Manter a documentação (`docs/`) atualizada após mudanças significativas

### 10.4 Verificação Pós-Implementação

Após qualquer implementação, verificar:

1. `cd server && npx tsc --noEmit` — sem erros de tipo
2. Se mexeu no schema: `npx prisma generate`
3. Se mexeu em batchUpsert: confirmar que cols.length = flatMap values por registro
4. Se criou nova rota: verificar se está registrada em `app.ts`
5. Se mexeu no frontend: verificar imports e tipos

---

## 11. Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | API + Front simultaneamente (concurrently) |
| `npm run dev:api` | Só a API (tsx watch) |
| `npm run dev:client` | Só o front (Vite) |
| `npm run build` | Compila TypeScript para `server/dist/` |
| `npm start` | Roda API compilada |
| `cd server && npx prisma generate` | Gera Prisma Client |
| `cd server && npx tsc --noEmit` | Verifica tipos sem compilar |

---

## 12. Documentação Relacionada

| Documento | Local | Descrição |
|-----------|-------|-----------|
| Regras de Negócio | `docs/regras-de-negocio.md` | O que o sistema faz — perfis, permissões, fluxos |
| Funcionalidades | `docs/funcionalidades.md` | Roadmap e specs técnicas por fase |
| API Reference | `server/README.md` | Endpoints, exemplos, estrutura do banco |
| Este guia | `docs/guia-desenvolvimento.md` | Como construir — convenções, padrões, restrições |
