# Internal Performance Monitoring Tool (IPMT)

## 1. Visão Geral do Projeto

O **Internal Performance Monitoring Tool (IPMT)** é uma ferramenta proprietária de backend desenvolvida para automatizar a **agregação de dados de performance de marketing** provenientes do **Meta Ads** e , futuramente, **Google Ads**.

Os dados são consolidados em um **banco de dados MySQL centralizado**, permitindo análises de **Business Intelligence (BI)** e geração de **relatórios consolidados** em Excel.

---

## 2. Guia de Utilização (Passo a Passo)

Para executar o projeto do zero, siga as etapas abaixo:

### 2.1 Clonar o repositório

```bash
git clone https://github.com/MatheusSangazu/ads-performance-api.git
```

### 2.2 Instalar as dependências

```bash
npm install
```

### 2.3 Configurar o ambiente

Crie um arquivo `.env` na raiz do projeto seguindo o modelo do `.env.example`.

Inclua:

* Credenciais do banco de dados MySQL
* Tokens de acesso das APIs (Meta Ads e Google Ads)

> ⚠️ **Nunca versionar o arquivo `.env` em repositórios públicos.**

### 2.4 Iniciar o servidor

```bash
npm run dev
```

### 2.5 Cadastrar um cliente

Utilize o endpoint `POST /clients` para registrar uma conta de anúncios no sistema.

### 2.6 Sincronizar os dados

Utilize o endpoint `POST /sync/manual` para realizar a importação de dados históricos.

### 2.7 Gerar e baixar o relatório

Acesse a rota de download para obter o arquivo Excel consolidado.

---

## 3. Endpoints e Documentação

### 3.1 Criar Novo Cliente (Configuração)

Registra uma nova conta de anúncios para monitoramento.

* **Rota:** `POST /clients`
* **Descrição:** Insere um novo registro na tabela `clients_config`

**Corpo da Requisição (JSON):**

```json
{
  "client_name": "NOMECLIENTE",
  "act_id": "act_IDCONTAANUNCIO",
  "access_token": "TOKEN_DO_FACEBOOK_AQUI",
  "is_active": 1,
  "is_ecommerce": 1
}
```

---

### 3.2 Sincronização Manual de Dados

Realiza a coleta de dados da API e grava no banco dentro de um intervalo de datas.

* **Rota:** `POST /sync/manual`

**Corpo da Requisição (JSON):**

```json
{
  "act_id": "act_IDCONTA",
  "since": "2025-01-01",
  "until": "2025-05-23"
}
```

---

### 3.3 Download de Relatório Excel

Gera e retorna uma planilha Excel formatada com métricas de funil, ROAS e links de preview.

* **Rota:** `GET /clients/:actId/download`

**Exemplo:**

```
http://localhost:3001/clients/IDCONTA/download
```

* **Resposta:** Arquivo `.xlsx` para download direto

---

## 4. Tecnologias Utilizadas

* **Runtime:** Node.js + TypeScript
* **Framework:** Express
* **Banco de Dados:** MySQL
* **Relatórios:** exceljs
* **Integrações:**

  * Meta Ads API
  * Google Ads API

---

## 5. Segurança

* O acesso aos endpoints deve ser **restrito**
* Em produção, utilizar:

  * JWT **ou**
  * API Key
* Tokens e credenciais devem permanecer apenas no `.env`

---

## 6. Histórico de Alterações

### O que mudou?

1. **Novo endpoint `POST /clients`**

   * Adicionado à documentação
   * Responsável por inserir dados na tabela `clients_config`

2. **Padronização dos payloads**

   * Estrutura dos corpos de requisição definida claramente em JSON

3. **Checklist de início do projeto**

   * Facilita a instalação e o onboarding de novos desenvolvedores

---

📌 Documento preparado para uso interno, versionamento e compartilhamento técnico.
