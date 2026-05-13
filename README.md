# Growth Ads API

API para coleta e armazenamento de dados de performance do **Meta Ads** em banco MySQL, com geração de relatórios Excel.

---

## Tecnologias

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **ORM:** Prisma 7
- **Banco de Dados:** MySQL
- **Relatórios:** ExcelJS
- **Integração:** Meta Ads API (Graph API v23.0)

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

### 4. Rodar

```bash
npm run dev
```

---

## Endpoints

### `POST /clients`

Cadastra ou atualiza um cliente (conta de anúncios).

```json
{
  "name": "Nome do Cliente",
  "act_id": "act_123456789",
  "access_token": "token_meta_ads",
  "custom_event_id": "opcional"
}
```

### `GET /clients`

Lista todos os clientes cadastrados.

### `GET /clients/:actId/download`

Gera e retorna um relatório Excel (.xlsx) com os dados de performance do cliente.

### `POST /sync/manual`

Sincroniza dados do Meta Ads para o banco dentro de um intervalo de datas.

```json
{
  "act_id": "act_123456789",
  "since": "2025-01-01",
  "until": "2025-05-23"
}
```

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (tsx watch) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Roda a API compilada |

---

## Estrutura

```
src/
├── config/
│   └── db.ts                  # Prisma Client + adapter MySQL
├── generated/
│   └── prisma/                # Código gerado pelo Prisma
├── routes/
│   ├── clientRoutes.ts        # Rotas de clientes e download
│   └── syncRoutes.ts          # Rota de sincronização
├── services/
│   ├── clientService.ts       # CRUD de clientes
│   ├── reportService.ts       # Geração de Excel
│   └── syncService.ts         # Sync com Meta Ads API
└── app.ts                     # Entry point Express

prisma/
└── schema.prisma              # Schema do banco (modelos Client e AdPerformance)
```

---

## Segurança

- Tokens e credenciais devem ficar apenas no `.env` (nunca versionar)
- Em produção, adicionar autenticação (JWT ou API Key)
