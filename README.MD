# ⚡ Voltaris Energy# ⚡ VOLTARIS ENERGY - Excelência na gestão de faturas de energia# ⚡ VOLTARIS ENERGY - Excelência na gestão de faturas de energia



**Excelência na gestão de faturas de energia.**



Sistema ERP web para gestão de faturas de energia com workflow de aprovações em múltiplos níveis, pagamentos e controle financeiro com rastreabilidade total.Sistema ERP web completo desenvolvido para a empresa **Voltaris Energy**, focado na gestão de faturas de energia, aprovações em múltiplos níveis, pagamentos e controle financeiro com rastreabilidade total.Sistema ERP web completo desenvolvido para a empresa **Voltaris Energy**, focado na gestão de faturas de energia, aprovações em múltiplos níveis, pagamentos e controle financeiro com rastreabilidade total.



---



## Stack> **Versão:** 2.0.0  > **Versão:** 1.0.0  



| Camada     | Tecnologia                                      |> **Última atualização:** 17 de Fevereiro de 2026  > **Última atualização:** 14 de Fevereiro de 2026  

|------------|--------------------------------------------------|

| Frontend   | React 18 + Vite 5 + React Router 6              |> **Status:** ✅ Em produção> **Status:** ✅ Em produção

| Backend    | Node.js + Express 4 (porta 3001)                 |

| ORM        | Prisma 5 (schema-first + migrations)             |

| Banco      | PostgreSQL 16 (Docker)                           |

| Auth       | JWT + bcryptjs (RBAC com 5 perfis)               |------

| PDF        | pdf-lib + pdfjs-dist + QRCode + Tesseract.js OCR |

| Excel      | ExcelJS 4                                        |

| UI         | CSS customizado + React Icons + Chart.js 4       |

## 🛠️ Stack Tecnológica## 🏗️ Arquitetura & Stack

---



## Perfis de Acesso (RBAC)

| Camada       | Tecnologia           | Detalhes                                        || Camada       | Tecnologia                          |

| Perfil         | Permissões                                                        |

|----------------|-------------------------------------------------------------------||--------------|----------------------|-------------------------------------------------||--------------|-------------------------------------|

| ADMINISTRADOR  | Acesso total (cadastros, faturas, aprovações, financeiro, usuários)|

| ADMINISTRATIVO | Cadastros, lançamento de faturas, relatórios                      || **Frontend** | React 18 + Vite 5   | SPA com roteamento protegido                    || Frontend     | React 18 + Vite 5 + React Router 6 |

| GERENTE_ADM    | Cadastros, faturas, aprovações, relatórios                        |

| DIRETOR        | Cadastros, faturas, aprovações, pagamentos, relatórios            || **Backend**  | Node.js + Express 4 | API REST + serve frontend build                 || Backend      | Node.js + Express 4                 |

| FINANCEIRO     | Cadastros, faturas, financeiro/baixas, relatórios                 |

| **Banco**    | PostgreSQL 16       | Docker container                                || ORM          | Prisma 5.10                         |

---

| **ORM**      | Prisma 5.10         | Schema-first com migrations                     || Banco        | PostgreSQL 16 (Docker)              |

## Funcionalidades

| **Auth**     | JWT + bcryptjs       | RBAC com 4 perfis                               || Auth         | JWT + bcryptjs                      |

- **Dashboard** — KPIs financeiros + gráficos interativos (Chart.js)

- **Cadastros** — 6 entidades: Filiais, Fornecedores, UCs, Centros de Custo, Contas Contábeis, Naturezas| **PDF**      | pdf-lib + Multer     | Geração de Capa de Processo + upload de faturas  || Upload       | Multer (PDF, 10MB max)              |

- **Lançamento de Faturas** — Split view (PDF + formulário), upload PDF, OCR automático (Energisa, Equatorial, CPFL, EDP), campos obrigatórios com validação

- **Workflow** — Lançar → Aprovar → Liberar → Baixar (com estorno), cada etapa registrada com usuário + data| **Charts**   | Chart.js             | Dashboard interativo                            || UI           | CSS customizado + React Icons       |

- **Processo Completo** — PDF unificado: Capa gerada (pdf-lib) + Pedido de Compras + Fatura anexa, com QR Code e hash HMAC-SHA256

- **Verificação Criptográfica** — Página pública `/verificar` para validar autenticidade via hash| **UI**       | React Toastify       | Notificações elegantes                          || Charts       | Chart.js 4 + react-chartjs-2       |

- **Relatórios** — Filtros avançados + exportação Excel/PDF

- **Auditoria** — Logs completos de todas as operações| **Icons**    | React Icons (Fi)     | Ícones Feather consistentes                     || Toasts       | React Toastify 10                   |

- **Boleto** — Leitura de código de barras com extração automática de valor e vencimento

| Excel        | ExcelJS 4 (Capa de Processo)        |

---

---| Tunnel       | localtunnel (acesso externo)        |

## Modelos do Banco (Prisma)

| Container    | Docker (PostgreSQL)                 |

`User`, `Filial`, `Fornecedor`, `UnidadeConsumidora`, `CentroCusto`, `ContaContabil`, `Natureza`, `Fatura`, `AuditLog`

## 📁 Estrutura do Projeto

Enums: `Role` (5 perfis), `FaturaStatus` (LANCADA → APROVADA → LIBERADA → BAIXADA / ESTORNADA / REJEITADA)

---

---

```

## Estrutura

PROJETO HF - HIDROFORTE/## 📁 Estrutura do Projeto

```

backend/│

├── prisma/          # Schema, migrations, seeds

├── src/├── backend/```

│   ├── config/      # database.js (PrismaClient)

│   ├── middlewares/  # auth.middleware.js (JWT+RBAC), upload.middleware.js│   ├── prisma/PROJETO HF - HIDROFORTE/

│   ├── routes/      # auth, cadastro, fatura, workflow, dashboard,

│   │                # relatorio, user, processoCompleto, capaProcesso,│   │   ├── migrations/                # Migrações do banco de dados├── backend/

│   │                # verificacao, boleto

│   ├── utils/       # auditLog.js, verificacaoHash.js│   │   ├── schema.prisma              # Schema do Prisma│   ├── prisma/

│   └── server.js    # Entry point (API + serve frontend build)

├── uploads/         # PDFs anexados│   │   ├── seed.js                    # Seed de usuários padrão│   │   ├── schema.prisma              # 9 modelos + 2 enums

└── .env             # DATABASE_URL, JWT_SECRET, PORT

│   │   ├── seedCentrosCusto.js        # Seed de centros de custo (JSON)│   │   ├── seed.js                    # 4 usuários iniciais

frontend/

├── src/│   │   └── seedImportar.js            # Seed unificado (C. Custo + Contas Contábeis)│   │   └── migrations/

│   ├── components/  # Layout, ReviewModal, ProcessoViewer, CapaProcesso, SearchableSelect

│   ├── contexts/    # AuthContext (login, logout, RBAC)│   ├── src/│   │       ├── 20260214160152_init/

│   ├── pages/       # Login, Dashboard, Cadastros, LancarFatura, Aprovacoes,

│   │                # Pagamentos, Financeiro, Relatorios, Usuarios│   │   ├── config/│   │       ├── 20260214161813_add_bank_fields_and_payment/

│   ├── services/    # api.js (Axios + interceptors)

│   ├── styles/      # CSS modular (global + components + pages)│   │   │   └── database.js            # Instância PrismaClient│   │       └── 20260214163828_add_tipo_pagamento_fornecedor/

│   └── data/        # estadosCidades.js

├── dist/            # Build de produção (servido pelo backend)│   │   ├── middlewares/│   ├── src/

└── index.html

```│   │   │   └── auth.middleware.js      # JWT + RBAC middleware│   │   ├── config/



---│   │   ├── routes/│   │   │   └── database.js            # Conexão Prisma



## Como Rodar│   │   │   ├── auth.routes.js         # Login + /me│   │   ├── middlewares/



### 1. Banco (Docker)│   │   │   ├── cadastro.routes.js     # CRUD de cadastros (6 entidades) + paginação│   │   │   ├── auth.middleware.js      # JWT + RBAC (4 perfis)



```bash│   │   │   ├── capaProcesso.routes.js # Gerar PDF Capa de Processo│   │   │   └── upload.middleware.js    # Upload de PDFs

docker run --name hidroforte-postgres \

  -e POSTGRES_PASSWORD=hidroforte123 \│   │   │   ├── dashboard.routes.js    # KPIs / Gráficos│   │   ├── routes/

  -e POSTGRES_DB=hidroforte_erp \

  -p 5432:5432 \│   │   │   ├── fatura.routes.js       # Lançamento de faturas│   │   │   ├── auth.routes.js         # Login / Me (mensagens específicas)

  -d postgres:16-alpine

```│   │   │   ├── processoCompleto.routes.js # PDF unificado (Capa + Fatura + Pedido)│   │   │   ├── cadastro.routes.js     # CRUD de cadastros (6 entidades)



> Reiniciar após reboot: `docker start hidroforte-postgres`│   │   │   ├── relatorio.routes.js    # Logs e relatórios│   │   │   ├── capaProcesso.routes.js # Gerar Excel Capa de Processo



### 2. Backend│   │   │   ├── user.routes.js         # Gestão de usuários│   │   │   ├── dashboard.routes.js    # KPIs / Gráficos



```bash│   │   │   └── workflow.routes.js     # Aprovação/Liberação/Baixa│   │   │   ├── fatura.routes.js       # Lançamento de faturas

cd backend

npm install│   │   ├── utils/│   │   │   ├── relatorio.routes.js    # Logs e relatórios

npm run setup    # prisma generate + migrate + seed

npm run dev      # porta 3001 (nodemon)│   │   │   └── auditLog.js            # Registro de auditoria│   │   │   ├── user.routes.js         # Gestão de usuários

```

│   │   └── server.js                  # Entry point (API + serve frontend build)│   │   │   └── workflow.routes.js     # Aprovação/Liberação/Baixa

`.env`:

```│   ├── templates/│   │   ├── utils/

DATABASE_URL="postgresql://postgres:hidroforte123@localhost:5432/hidroforte_erp"

JWT_SECRET="hidroforte-erp-secret-key-2026-mudar-em-producao"│   │   └── capa-processo-modelo.xlsx  # Template Excel (legado)│   │   │   └── auditLog.js            # Registro de auditoria

JWT_EXPIRES_IN="8h"

PORT=3001│   ├── uploads/                       # PDFs anexados às faturas│   │   └── server.js                  # Entry point (API + serve frontend build)

```

│   ├── .env                           # Configurações sensíveis│   ├── templates/

### 3. Frontend

│   └── package.json│   │   └── capa-processo-modelo.xlsx  # Template Excel para Capa de Processo

```bash

cd frontend││   ├── uploads/                       # PDFs anexados às faturas

npm install

npm run build    # gera dist/ servido pelo backend├── frontend/│   ├── .env                           # Configurações sensíveis

```

│   ├── src/│   └── package.json

Acesse: `http://localhost:3001`

│   │   ├── components/│

---

│   │   │   ├── Layout.jsx             # Sidebar + Main (responsivo)├── frontend/

## Usuários Padrão (Seed)

│   │   │   ├── ProcessoViewer.jsx     # Visualizador fullscreen de PDF unificado│   ├── src/

| Perfil         | Email                        | Senha    |

|----------------|------------------------------|----------|│   │   │   └── ReviewModal.jsx        # Modal de revisão + botão Visualizar Processo│   │   ├── components/

| Administrador  | admin@voltaris.com.br        | admin123 |

| Operador       | operador@voltaris.com.br     | admin123 |│   │   ├── contexts/│   │   │   ├── Layout.jsx             # Sidebar + Main (responsivo)

| Diretoria      | diretoria@voltaris.com.br    | admin123 |

| Financeiro     | financeiro@voltaris.com.br   | admin123 |│   │   │   └── AuthContext.jsx        # Contexto de autenticação│   │   │   └── ReviewModal.jsx        # Modal de revisão + botão Capa de Processo



---│   │   ├── data/│   │   ├── contexts/



## LocalStorage Keys│   │   │   └── estadosCidades.js      # Estados e cidades do Brasil│   │   │   └── AuthContext.jsx        # Contexto de autenticação



- `@voltaris:token` — JWT token│   │   ├── pages/│   │   ├── data/

- `@voltaris:user` — Dados do usuário logado

│   │   │   ├── Login.jsx              # Login com mensagens de erro inline│   │   │   └── estadosCidades.js      # Estados e cidades do Brasil

---

│   │   │   ├── Dashboard.jsx          # KPIs + gráficos interativos│   │   ├── pages/

*Desenvolvido por Luan Oliveira*

│   │   │   ├── Cadastros.jsx          # 6 abas com paginação e busca│   │   │   ├── Login.jsx              # Login com mensagens de erro inline

│   │   │   ├── LancarFatura.jsx       # Split view (PDF + formulário)│   │   │   ├── Dashboard.jsx          # KPIs + gráficos interativos

│   │   │   ├── Aprovacoes.jsx         # Fila de aprovação (Diretoria)│   │   │   ├── Cadastros.jsx          # 6 abas de cadastros

│   │   │   ├── Pagamentos.jsx         # Fila de liberação (Financeiro)│   │   │   ├── LancarFatura.jsx       # Split view (PDF + formulário)

│   │   │   ├── Financeiro.jsx         # Baixas e confirmação│   │   │   ├── Aprovacoes.jsx         # Fila de aprovação (Diretoria)

│   │   │   ├── Relatorios.jsx         # Logs + relatório com filtros│   │   │   ├── Pagamentos.jsx         # Fila de liberação (Financeiro)

│   │   │   └── Usuarios.jsx           # CRUD de usuários (admin)│   │   │   ├── Financeiro.jsx         # Baixas e confirmação

│   │   ├── services/│   │   │   ├── Relatorios.jsx         # Logs + relatório com filtros

│   │   │   └── api.js                 # Axios (interceptors inteligentes)│   │   │   └── Usuarios.jsx           # CRUD de usuários (admin)

│   │   ├── styles/│   │   ├── services/

│   │   │   ├── global.css             # Entry point CSS (@imports modulares)│   │   │   └── api.js                 # Axios (interceptors inteligentes)

│   │   │   ├── processoViewer.css     # Estilos do visualizador de processo│   │   ├── styles/

│   │   │   ├── components/│   │   │   └── global.css             # CSS global customizado

│   │   │   │   ├── sidebar.css        # Sidebar / navegação│   │   ├── utils/

│   │   │   │   ├── cards.css          # Cards de listagem│   │   │   └── formatters.js          # CNPJ, moeda, data

│   │   │   │   ├── tabs.css           # Abas de navegação│   │   ├── App.jsx                    # Rotas protegidas por perfil

│   │   │   │   ├── forms.css          # Formulários e inputs│   │   └── main.jsx                   # Entry point + ToastContainer

│   │   │   │   ├── buttons.css        # Botões e ações│   ├── dist/                          # Build de produção (servido pelo backend)

│   │   │   │   ├── tables.css         # Tabelas de dados│   ├── index.html

│   │   │   │   ├── badges.css         # Badges de status│   ├── vite.config.js                 # Proxy /api e /uploads → :3001

│   │   │   │   ├── modal.css          # Modais│   └── package.json

│   │   │   │   └── pagination.css     # Paginação e busca│

│   │   │   └── pages/├── referencia.html                    # HTML de referência visual

│   │   │       ├── login.css          # Página de login├── package.json

│   │   │       ├── cadastros.css      # Página de cadastros└── README.MD

│   │   │       └── lancamento.css     # Página de lançamento```

│   │   ├── utils/

│   │   │   └── formatters.js          # CNPJ, moeda, data (com null guards)---

│   │   ├── App.jsx                    # Rotas protegidas por perfil

│   │   └── main.jsx                   # Entry point + ToastContainer## 🚀 Como Rodar

│   ├── dist/                          # Build de produção (servido pelo backend)

│   ├── index.html### Pré-requisitos

│   ├── vite.config.js                 # Proxy /api e /uploads → :3001

│   └── package.json- **Node.js** >= 18

│- **Docker Desktop** (para PostgreSQL)

├── referencia.html                    # HTML de referência visual- **npm**

├── package.json

└── README.MD### 1. Banco de Dados (Docker)

```

```bash

---docker run --name hidroforte-postgres \

  -e POSTGRES_PASSWORD=hidroforte123 \

## 🚀 Como Rodar  -e POSTGRES_DB=hidroforte_erp \

  -p 5432:5432 \

### Pré-requisitos  -d postgres:16-alpine

```

- **Node.js** >= 18

- **Docker Desktop** (para PostgreSQL)> Para reiniciar após reboot: `docker start hidroforte-postgres`

- **npm**

### 2. Backend

### 1. Banco de Dados (Docker)

```bash

```bashcd backend

docker run --name hidroforte-postgres \

  -e POSTGRES_PASSWORD=hidroforte123 \# Instalar dependências

  -e POSTGRES_DB=hidroforte_erp \npm install

  -p 5432:5432 \

  -d postgres:16-alpine# Configurar o .env

```# DATABASE_URL="postgresql://postgres:hidroforte123@localhost:5432/hidroforte_erp"

# JWT_SECRET="hidroforte-erp-secret-key-2026-mudar-em-producao"

> Para reiniciar após reboot: `docker start hidroforte-postgres`# JWT_EXPIRES_IN="8h"

# PORT=3001

### 2. Backend

# Gerar Prisma Client + Criar tabelas + Seed

```bashnpm run setup

cd backend

# Iniciar servidor

# Instalar dependênciasnpm run dev        # development (com nodemon)

npm installnpm run start      # production

```

# Configurar o .env

# DATABASE_URL="postgresql://postgres:hidroforte123@localhost:5432/hidroforte_erp"O backend rodará em `http://localhost:3001`

# JWT_SECRET="hidroforte-erp-secret-key-2026-mudar-em-producao"

# JWT_EXPIRES_IN="8h"### 3. Frontend

# PORT=3001

```bash

# Gerar Prisma Client + Criar tabelas + Seed de usuárioscd frontend

npm run setup

# Instalar dependências

# Importar Centros de Custo + Contas Contábeis (seed unificado)npm install

node prisma/seedImportar.js

# Desenvolvimento

# Iniciar servidornpm run dev        # http://localhost:5173 (proxy para backend)

npm run dev        # development (com nodemon)

npm run start      # production# Build de produção (servido pelo backend)

```npm run build      # Gera ./dist

```

O backend rodará em `http://localhost:3001`



### 3. Frontend## 👤 Usuários Padrão (Seed)



```bash| Perfil        | Email                          | Senha     |

cd frontend|---------------|--------------------------------|-----------|

| Administrador | admin@voltaris.com.br        | admin123  |

# Instalar dependências| Operador      | operador@voltaris.com.br     | admin123  |

npm install| Diretoria     | diretoria@voltaris.com.br    | admin123  |

| Financeiro    | financeiro@voltaris.com.br   | admin123  |

# Desenvolvimento

npm run dev        # http://localhost:5173 (proxy para backend)---



# Build de produção (servido pelo backend)## 🔐 Perfis e Permissões (RBAC)

npm run build      # Gera ./dist

```| Perfil         | Descrição                              | Módulos                                              |

|----------------|----------------------------------------|------------------------------------------------------|

---| Administrador  | Gestão Total                           | Todos                                                |

| Operador       | Entrada de Dados                       | Dashboard, Cadastros, Lançar Fatura, Financeiro      |

## 🌱 Seeds (Dados Iniciais)| Diretoria      | Validação Técnica/Estratégica          | Dashboard, Aprovações                                |

| Financeiro     | Fluxo de Caixa / Recebimento          | Dashboard, Pagamentos, Relatórios                    |

### Usuários (`seed.js`)

- Middleware `auth.middleware.js` valida JWT + verifica perfil em cada rota

Executado automaticamente via `npm run setup`.- Sidebar exibe apenas módulos permitidos para o perfil logado

- Rotas protegidas no frontend (React Router) e backend (Express middleware)

| Perfil        | Email                          | Senha     |

|---------------|--------------------------------|-----------|---

| Administrador | admin@hidroforte.com.br        | admin123  |

| Operador      | operador@hidroforte.com.br     | admin123  |## 📋 Fluxo de Trabalho (Workflow)

| Diretoria     | diretoria@hidroforte.com.br    | admin123  |

| Financeiro    | financeiro@hidroforte.com.br   | admin123  |```

Operador lança fatura (PENDENTE)

### Centros de Custo + Contas Contábeis (`seedImportar.js`)        ↓

Diretoria aprova/rejeita (APROVADA / REJEITADA)

Seed unificado que importa dados de dois arquivos JSON:        ↓

Financeiro libera pagamento (LIBERADA)

| Fonte                    | Registros no JSON | Únicos importados | Observação                         |        ↓

|--------------------------|-------------------|--------------------|-------------------------------------|Financeiro confirma baixa (PAGA)

| `Centro_de_custo.json`   | 748               | 748                | Chaves: `Classe` e string vazia    |```

| `contas_contabil.json`   | 538               | 278                | 260 duplicatas removidas por upsert |

Cada etapa registra:

- Utiliza `upsert` para evitar duplicação em re-execuções- **Quem** executou a ação (usuário responsável)

- Campos importados: `numero` e `descricao`- **Quando** foi executada (timestamp)

- **IP** do solicitante

---- **Log de auditoria** completo no banco (tabela `audit_logs`)



## 🔐 Perfis e Permissões (RBAC)---



| Perfil         | Descrição                              | Módulos                                              |## 📊 Módulos Detalhados

|----------------|----------------------------------------|------------------------------------------------------|

| Administrador  | Gestão Total                           | Todos                                                |### 1. 🔑 Login

| Operador       | Entrada de Dados                       | Dashboard, Cadastros, Lançar Fatura, Financeiro      |- Autenticação JWT com expiração de 8h

| Diretoria      | Validação Técnica/Estratégica          | Dashboard, Aprovações                                |- Mensagens de erro específicas:

| Financeiro     | Fluxo de Caixa / Recebimento          | Dashboard, Pagamentos, Relatórios                    |  - "E-mail não encontrado no sistema"

  - "Usuário desativado. Contate o administrador"

- Middleware `auth.middleware.js` valida JWT + verifica perfil em cada rota  - "Senha incorreta"

- Sidebar exibe apenas módulos permitidos para o perfil logado- Exibição de erros inline + toast (React Toastify)

- Rotas protegidas no frontend (React Router) e backend (Express middleware)- Interceptor inteligente no Axios: só redireciona para login em 401 de token expirado (não em falha de login)



---### 2. 📊 Dashboard

- KPIs: total pendente, total pago, média kWh, faturas do mês

## 📋 Fluxo de Trabalho (Workflow)- Gráficos interativos com Chart.js:

  - Faturas por status (pizza)

```  - Valores por mês (barras)

Operador lança fatura (PENDENTE)

        ↓### 3. 📝 Cadastros (6 entidades)

Diretoria aprova/rejeita (APROVADA / REJEITADA)Cada entidade tem CRUD completo com listagem, busca, ativação/desativação:

        ↓

Financeiro libera pagamento (LIBERADA)| Entidade              | Campos principais                                              |

        ↓|-----------------------|----------------------------------------------------------------|

Financeiro confirma baixa (PAGA)| **Filiais**           | Razão Social, CNPJ, Estado, Cidade                             |

```| **Fornecedores**      | Nome, CNPJ, Tipo de Pagamento, dados bancários/PIX condicionais |

| **Unidades Consumidoras** | UC, Nº Instalação, Filial vinculada, Fornecedor vinculado   |

Cada etapa registra:| **Centros de Custo**  | Número, Descrição                                               |

- **Quem** executou a ação (usuário responsável)| **Contas Contábeis**  | Número, Descrição                                               |

- **Quando** foi executada (timestamp)| **Naturezas**         | Descrição                                                       |

- **IP** do solicitante

- **Log de auditoria** completo no banco (tabela `audit_logs`)#### Formulário Condicional de Fornecedor

O campo **Tipo de Pagamento** controla quais campos são exibidos:

---

| Tipo     | Campos exibidos                                    |

## 📊 Módulos Detalhados|----------|---------------------------------------------------|

| **TED**  | Banco, Agência, Conta, Tipo de Conta, OP          |

### 1. 🔑 Login| **PIX**  | Tipo de Chave PIX, Chave PIX                       |

- Autenticação JWT com expiração de 8h| **Boleto** | Nenhum campo adicional (apenas informativo)      |

- Mensagens de erro específicas:

  - "E-mail não encontrado no sistema"### 4. 📄 Lançar Fatura

  - "Usuário desativado. Contate o administrador"- **Split view**: visualizador de PDF à esquerda + formulário à direita

  - "Senha incorreta"- Campos: UC, Filial (auto), Fornecedor (auto), Nota Fiscal, Valor, Leitura kWh, Vencimento, Referência, Pedido de Compras, Centro de Custo, Conta Contábil, Natureza

- Exibição de erros inline + toast (React Toastify)- **Forma de Pagamento** preenchida automaticamente do cadastro do fornecedor (readonly)

- Interceptor inteligente no Axios: só redireciona para login em 401 de token expirado (não em falha de login)- **Aplicação** (CAPEX / OPEX) como campo separado

- Upload de PDF da fatura e do pedido de compras (max 10MB cada)

### 2. 📊 Dashboard

- KPIs: total pendente, total pago, média kWh, faturas do mês### 5. ✅ Aprovações

- Gráficos interativos com Chart.js:- Fila de faturas pendentes para aprovação

  - Faturas por status (pizza)- Visualização de todos os detalhes + PDF anexo

  - Valores por mês (barras)- Opções: Aprovar / Rejeitar (com motivo obrigatório)

- Acesso: Diretoria e Administrador

### 3. 📝 Cadastros (6 entidades)

Cada entidade tem CRUD completo com listagem, busca, ativação/desativação:### 6. 💳 Pagamentos

- Fila de faturas aprovadas para liberação de pagamento

| Entidade              | Campos principais                                              |- Financeiro libera o pagamento

|-----------------------|----------------------------------------------------------------|- Acesso: Financeiro e Administrador

| **Filiais**           | Razão Social, CNPJ, Estado, Cidade                             |

| **Fornecedores**      | Nome, CNPJ, Tipo de Pagamento, dados bancários/PIX condicionais |### 7. 💰 Financeiro / Baixas

| **Unidades Consumidoras** | UC, Nº Instalação, Filial vinculada, Fornecedor vinculado   |- Confirmação final de pagamento (baixa)

| **Centros de Custo**  | Número, Descrição                                               |- Registro de data e responsável pela baixa

| **Contas Contábeis**  | Número, Descrição                                               |- Acesso: Operador, Financeiro e Administrador

| **Naturezas**         | Descrição                                                       |

### 8. 📈 Relatórios

#### Paginação Server-Side (C. Custo e Contas Contábeis)- **Log de auditoria**: todas as ações do sistema com filtros

- Tabelas com grande volume de dados (748 e 278 registros) possuem **paginação server-side**- **Relatório de faturas**: filtros por status, período, filial

- 20 registros por página com navegação (anterior/próxima)- Acesso: Financeiro e Administrador

- **Busca com debounce** (400ms) para filtrar por número ou descrição

- Layout compacto em tabela (Número | Descrição | Ações) diferente do layout em cards das demais entidades### 9. 👥 Gestão de Usuários

- Quando acessados por selects/dropdowns (sem parâmetros de paginação), retornam a lista completa- CRUD de usuários (criar, editar, ativar/desativar)

- Definição de perfil (ADMINISTRADOR, OPERADOR, DIRETORIA, FINANCEIRO)

#### Formulário Condicional de Fornecedor- Acesso: Administrador apenas

O campo **Tipo de Pagamento** controla quais campos são exibidos:

---

| Tipo     | Campos exibidos                                    |

|----------|---------------------------------------------------|## 📑 Capa de Processo (Excel)

| **TED**  | Banco, Agência, Conta, Tipo de Conta, OP          |

| **PIX**  | Tipo de Chave PIX, Chave PIX                       |Funcionalidade de geração automática de "Capa de Processo" em Excel a partir dos dados de uma fatura.

| **Boleto** | Nenhum campo adicional (apenas informativo)      |

### Como funciona:

### 4. 📄 Lançar Fatura1. Na tela de **Aprovações** ou **Pagamentos**, ao revisar uma fatura, clique em **"Gerar Capa de Processo"**

- **Split view**: visualizador de PDF à esquerda + formulário à direita2. O sistema lê o template Excel (`backend/templates/capa-processo-modelo.xlsx`)

- Campos: UC, Filial (auto), Fornecedor (auto), Nota Fiscal, Valor, Leitura kWh, Vencimento, Referência, Pedido de Compras, Centro de Custo, Conta Contábil, Natureza3. Preenche automaticamente os campos com dados da fatura:

- **Forma de Pagamento** preenchida automaticamente do cadastro do fornecedor (readonly)   - Dados do fornecedor (nome, CNPJ, dados bancários/PIX)

- **Aplicação** (CAPEX / OPEX) como campo separado   - Dados da fatura (valor, vencimento, forma de pagamento, aplicação)

- Upload de PDF da fatura e do pedido de compras (max 10MB cada)   - Dados da filial e unidade consumidora

4. Retorna o arquivo Excel preenchido para download

### 5. ✅ Aprovações

- Fila de faturas pendentes para aprovação### Endpoint:

- Botão **"Visualizar Processo"** abre PDF unificado (Capa + Fatura + Pedido)```

- Opções: Aprovar / Rejeitar (com motivo obrigatório)GET /api/faturas/:id/capa-processo

- Acesso: Diretoria e Administrador→ Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

```

### 6. 💳 Pagamentos

- Fila de faturas aprovadas para liberação de pagamento---

- Financeiro libera o pagamento

- Acesso: Financeiro e Administrador## 🗄️ Modelo de Dados (Prisma)



### 7. 💰 Financeiro / Baixas### Enums

- Confirmação final de pagamento (baixa)

- Registro de data e responsável pela baixa| Enum          | Valores                                              |

- Acesso: Operador, Financeiro e Administrador|---------------|------------------------------------------------------|

| `Role`        | ADMINISTRADOR, OPERADOR, DIRETORIA, FINANCEIRO       |

### 8. 📈 Relatórios| `FaturaStatus`| PENDENTE, APROVADA, LIBERADA, PAGA, REJEITADA        |

- **Log de auditoria**: todas as ações do sistema com filtros

- **Relatório de faturas**: filtros por status, período, filial### Modelos (9 tabelas)

- Acesso: Financeiro e Administrador

| Modelo              | Tabela               | Descrição                                |

### 9. 👥 Gestão de Usuários|---------------------|----------------------|------------------------------------------|

- CRUD de usuários (criar, editar, ativar/desativar)| `User`              | `users`              | Usuários do sistema                       |

- Definição de perfil (ADMINISTRADOR, OPERADOR, DIRETORIA, FINANCEIRO)| `Filial`            | `filiais`            | Filiais da empresa                        |

- Acesso: Administrador apenas| `Fornecedor`        | `fornecedores`       | Fornecedores (com dados bancários/PIX)    |

| `UnidadeConsumidora`| `unidades_consumidoras` | Unidades consumidoras de energia       |

---| `CentroCusto`       | `centros_custo`      | Centros de custo contábeis               |

| `ContaContabil`     | `contas_contabeis`   | Contas contábeis                          |

## 📑 Processo Completo (PDF Unificado)| `Natureza`          | `naturezas`          | Naturezas de despesa                      |

| `Fatura`            | `faturas`            | Faturas com workflow completo             |

Funcionalidade de visualização integrada de todo o processo de uma fatura em um único PDF.| `AuditLog`          | `audit_logs`         | Log de auditoria de todas as ações        |



### Como funciona:### Migrações aplicadas:

1. Na tela de **Aprovações** ou **Pagamentos**, ao revisar uma fatura, clique em **"Visualizar Processo"**1. `init` — Estrutura base com todos os modelos

2. O backend gera o PDF completo server-side usando **pdf-lib**:2. `add_bank_fields_and_payment` — Campos bancários em Fornecedor + formaPagamento/aplicação em Fatura

   - **Capa de Processo** — gerada programaticamente com todos os dados da fatura (fornecedor, valores, dados bancários/PIX, filial, UC, etc.)3. `add_tipo_pagamento_fornecedor` — Campo tipoPagamento no Fornecedor

   - **PDF da Fatura** — anexo original enviado pelo operador

   - **PDF do Pedido de Compras** — anexo original enviado pelo operador---

3. Os três documentos são mesclados em um único PDF

4. O PDF é retornado como **base64 dentro de JSON** (`Content-Type: application/json`) para evitar interceptação por gerenciadores de download (IDM bypass)## 🔌 API Endpoints

5. O frontend decodifica o base64, cria um Blob e exibe em um visualizador fullscreen (`ProcessoViewer.jsx`)

### Autenticação

### Capa de Processo — Layout:| Método | Rota              | Descrição                    |

- Gerada com **pdf-lib** (StandardFonts.Helvetica / HelveticaBold)|--------|--------------------|------------------------------|

- Cabeçalho: "CAPA DE PROCESSO" + "SOLICITAÇÃO DE PAGAMENTO"| POST   | `/api/auth/login`  | Login (retorna JWT)          |

- Tabela com bordas uniformes (espessura 0.6pt, cor `rgb(0, 0, 0)`)| GET    | `/api/auth/me`     | Dados do usuário logado      |

- Campos: Fornecedor, CNPJ, Forma de Pagamento, Banco, Agência, Conta, Tipo de Conta, Chave PIX, Tipo Chave PIX, Valor, Competência, Vencimento, Filial, UC, Nº Instalação, Aplicação, Centro de Custo, Conta Contábil, Nota Fiscal, Pedido de Compras, Observações

### Cadastros

### Endpoint:| Método | Rota                        | Descrição                    |

```|--------|-----------------------------|------------------------------|

GET /api/processo-completo/:faturaId| GET    | `/api/cadastros/:tipo`      | Listar (filiais, fornecedores, ucs, centros-custo, contas-contabeis, naturezas) |

→ Content-Type: application/json| POST   | `/api/cadastros/:tipo`      | Criar                         |

→ Body: { pdf: "<base64 string>" }| PUT    | `/api/cadastros/:tipo/:id`  | Atualizar                     |

```| PATCH  | `/api/cadastros/:tipo/:id/toggle` | Ativar/Desativar         |



---### Faturas

| Método | Rota                               | Descrição                    |

## 🎨 Arquitetura CSS (Modularizada)|--------|-------------------------------------|------------------------------|

| GET    | `/api/faturas`                      | Listar faturas               |

O CSS do projeto é organizado em módulos para facilitar manutenção e evitar conflitos:| POST   | `/api/faturas`                      | Lançar nova fatura           |

| GET    | `/api/faturas/:id/capa-processo`    | Gerar Excel Capa de Processo |

```

styles/### Workflow

├── global.css              # Entry point — @imports de todos os módulos| Método | Rota                          | Descrição                    |

│                           # Contém apenas: reset, variáveis CSS e :root|--------|-------------------------------|------------------------------|

├── processoViewer.css      # Estilos do visualizador fullscreen| PATCH  | `/api/workflow/:id/aprovar`   | Aprovar fatura               |

├── components/| PATCH  | `/api/workflow/:id/rejeitar`  | Rejeitar fatura              |

│   ├── sidebar.css         # Sidebar, nav links, logo| PATCH  | `/api/workflow/:id/liberar`   | Liberar pagamento            |

│   ├── cards.css           # Cards de listagem (.card, .card-header)| PATCH  | `/api/workflow/:id/baixar`    | Confirmar baixa/pagamento    |

│   ├── tabs.css            # Abas de navegação (.tabs-container)

│   ├── forms.css           # Inputs, labels, form-group, form-row### Dashboard

│   ├── buttons.css         # .btn, .btn-primary, .btn-danger, etc.| Método | Rota                    | Descrição                    |

│   ├── tables.css          # .cadastro-table, table thead/tbody|--------|-------------------------|------------------------------|

│   ├── badges.css          # .badge, .badge-ativo, .badge-inativo| GET    | `/api/dashboard/kpis`   | KPIs (totais e médias)       |

│   ├── modal.css           # .modal-overlay, .modal-content| GET    | `/api/dashboard/charts` | Dados para gráficos          |

│   └── pagination.css      # .pagination-bar, .search-bar, .search-input-wrap

└── pages/### Relatórios

    ├── login.css           # .login-container, .login-card| Método | Rota                          | Descrição                    |

    ├── cadastros.css       # .page-header, .list-header|--------|-------------------------------|------------------------------|

    └── lancamento.css      # .lancamento-container, .split-view| GET    | `/api/relatorios/auditoria`   | Log de auditoria             |

```| GET    | `/api/relatorios/faturas`     | Relatório de faturas         |



- `global.css` importa todos os módulos via `@import`### Usuários

- Cada módulo é independente e responsável por um único conceito visual| Método | Rota                              | Descrição                    |

- Build final (Vite): ~27 KB de CSS otimizado|--------|-----------------------------------|------------------------------|

| GET    | `/api/users`                      | Listar usuários              |

---| POST   | `/api/users`                      | Criar usuário                |

| PUT    | `/api/users/:id`                  | Atualizar usuário            |

## 🗄️ Modelo de Dados (Prisma)| PATCH  | `/api/users/:id/toggle`           | Ativar/Desativar             |



### Enums### Utilitários

| Método | Rota              | Descrição                    |

| Enum          | Valores                                              ||--------|--------------------|------------------------------|

|---------------|------------------------------------------------------|| GET    | `/api/health`      | Health check do servidor     |

| `Role`        | ADMINISTRADOR, OPERADOR, DIRETORIA, FINANCEIRO       |

| `FaturaStatus`| PENDENTE, APROVADA, LIBERADA, PAGA, REJEITADA        |---



### Modelos (9 tabelas)## 🛡️ Segurança



| Modelo              | Tabela               | Descrição                                |- **JWT** com secret configurável e expiração de 8h

|---------------------|----------------------|------------------------------------------|- **bcryptjs** para hash de senhas (salt rounds: 10)

| `User`              | `users`              | Usuários do sistema                       |- **RBAC** (Role-Based Access Control) em todas as rotas

| `Filial`            | `filiais`            | Filiais da empresa                        |- **Interceptor Axios inteligente**: redireciona para login apenas em 401 de token expirado (ignora erros de autenticação na tela de login)

| `Fornecedor`        | `fornecedores`       | Fornecedores (com dados bancários/PIX)    |- **Validação** de dados no backend com express-validator

| `UnidadeConsumidora`| `unidades_consumidoras` | Unidades consumidoras de energia       |- **Upload seguro**: apenas PDFs, limite de 10MB

| `CentroCusto`       | `centros_custo`      | Centros de custo contábeis               |- **Auditoria completa**: toda ação registrada com usuário, IP e timestamp

| `ContaContabil`     | `contas_contabeis`   | Contas contábeis                          |

| `Natureza`          | `naturezas`          | Naturezas de despesa                      |---

| `Fatura`            | `faturas`            | Faturas com workflow completo             |

| `AuditLog`          | `audit_logs`         | Log de auditoria de todas as ações        |## 🐛 Correções e Melhorias Implementadas



### Migrações aplicadas:### Formulário Condicional de Fornecedor

1. `init` — Estrutura base com todos os modelos- Campos de pagamento exibidos condicionalmente baseado no tipo (TED/PIX/BOLETO)

2. `add_bank_fields_and_payment` — Campos bancários em Fornecedor + formaPagamento/aplicação em Fatura- Dados limpos automaticamente ao trocar tipo de pagamento

3. `add_tipo_pagamento_fornecedor` — Campo tipoPagamento no Fornecedor- Forma de pagamento auto-preenchida na fatura a partir do cadastro do fornecedor



---### Capa de Processo (Excel)

- Geração automática de Excel preenchido a partir de template

## 🔌 API Endpoints- Preenchimento de dados do fornecedor, fatura e unidade consumidora

- Download direto pelo navegador via blob

### Autenticação

| Método | Rota              | Descrição                    |### Mensagens de Erro no Login

|--------|--------------------|------------------------------|- Backend retorna mensagens específicas (email não encontrado, usuário desativado, senha incorreta)

| POST   | `/api/auth/login`  | Login (retorna JWT)          |- Frontend exibe erros inline (caixa vermelha) + toast notification

| GET    | `/api/auth/me`     | Dados do usuário logado      |- **Correção do toast sumindo**: interceptor 401 do Axios agora ignora requisições de login, evitando redirect que destruía o toast



### Cadastros### Produção / Deploy

| Método | Rota                        | Descrição                    |- Backend serve o build do frontend (`frontend/dist`) em produção

|--------|-----------------------------|------------------------------|- Rota wildcard `app.get('*')` serve `index.html` para SPA routing

| GET    | `/api/cadastros/:tipo`      | Listar (filiais, fornecedores, ucs, centros-custo, contas-contabeis, naturezas) |- Acesso externo via localtunnel sem necessidade de configuração de rede

| GET    | `/api/cadastros/:tipo?page=1&limit=20&search=texto` | Listar com paginação e busca |

| POST   | `/api/cadastros/:tipo`      | Criar                         |---

| PUT    | `/api/cadastros/:tipo/:id`  | Atualizar                     |

| PATCH  | `/api/cadastros/:tipo/:id/toggle` | Ativar/Desativar         |## ⚙️ Variáveis de Ambiente (.env)



> **Nota:** Quando `page`, `limit` ou `search` são informados, o retorno é `{ data: [], pagination: { page, limit, total, totalPages } }`. Sem esses parâmetros, retorna o array completo (usado por selects/dropdowns).```env

DATABASE_URL="postgresql://postgres:hidroforte123@localhost:5432/hidroforte_erp"

### FaturasJWT_SECRET="hidroforte-erp-secret-key-2026-mudar-em-producao"

| Método | Rota                               | Descrição                    |JWT_EXPIRES_IN="8h"

|--------|-------------------------------------|------------------------------|PORT=3001

| GET    | `/api/faturas`                      | Listar faturas               |```

| POST   | `/api/faturas`                      | Lançar nova fatura           |

---

### Processo Completo (PDF)

| Método | Rota                                    | Descrição                    |## 🔮 Próximos Passos (Planejado)

|--------|-----------------------------------------|------------------------------|

| GET    | `/api/processo-completo/:faturaId`      | PDF unificado (Capa + Fatura + Pedido) em base64 |- [ ] Exportação de relatórios para Excel/PDF

- [ ] Notificações por email (aprovação, rejeição, pagamento)

### Workflow- [ ] Dashboard avançado com filtros por período/filial

| Método | Rota                          | Descrição                    |- [ ] Integração com sistemas de pagamento bancário

|--------|-------------------------------|------------------------------|- [ ] Múltiplos anexos por fatura

| PATCH  | `/api/workflow/:id/aprovar`   | Aprovar fatura               |- [ ] Histórico de alterações em cadastros

| PATCH  | `/api/workflow/:id/rejeitar`  | Rejeitar fatura              |- [ ] Modo escuro (dark theme)

| PATCH  | `/api/workflow/:id/liberar`   | Liberar pagamento            |- [ ] Relatórios gráficos por fornecedor e centro de custo

| PATCH  | `/api/workflow/:id/baixar`    | Confirmar baixa/pagamento    |

---

### Dashboard

| Método | Rota                    | Descrição                    |## 📝 Licença

|--------|-------------------------|------------------------------|

| GET    | `/api/dashboard/kpis`   | KPIs (totais e médias)       |Projeto proprietário - Hidroforte © 2026

| GET    | `/api/dashboard/charts` | Dados para gráficos          |

### Relatórios
| Método | Rota                          | Descrição                    |
|--------|-------------------------------|------------------------------|
| GET    | `/api/relatorios/auditoria`   | Log de auditoria             |
| GET    | `/api/relatorios/faturas`     | Relatório de faturas         |

### Usuários
| Método | Rota                              | Descrição                    |
|--------|-----------------------------------|------------------------------|
| GET    | `/api/users`                      | Listar usuários              |
| POST   | `/api/users`                      | Criar usuário                |
| PUT    | `/api/users/:id`                  | Atualizar usuário            |
| PATCH  | `/api/users/:id/toggle`           | Ativar/Desativar             |

### Utilitários
| Método | Rota              | Descrição                    |
|--------|--------------------|------------------------------|
| GET    | `/api/health`      | Health check do servidor     |

---

## 🛡️ Segurança

- **JWT** com secret configurável e expiração de 8h
- **bcryptjs** para hash de senhas (salt rounds: 10)
- **RBAC** (Role-Based Access Control) em todas as rotas
- **Interceptor Axios inteligente**: redireciona para login apenas em 401 de token expirado (ignora erros de autenticação na tela de login)
- **Validação** de dados no backend com express-validator
- **Upload seguro**: apenas PDFs, limite de 10MB
- **Auditoria completa**: toda ação registrada com usuário, IP e timestamp
- **IDM bypass**: PDFs retornados como base64 em JSON para evitar interceptação

---

## 🐛 Correções e Melhorias Implementadas

### v2.0.0 (Fevereiro 2026)

#### 📑 PDF Unificado (Processo Completo)
- Substituição do Excel (ExcelJS) por **pdf-lib** para geração da Capa de Processo
- Unificação de 3 botões separados (Capa, Fatura, Pedido) em único botão **"Visualizar Processo"**
- Mesclagem server-side dos 3 PDFs em documento único
- Retorno via base64 JSON para **bypass de IDM** (Internet Download Manager)
- Visualizador fullscreen dedicado (`ProcessoViewer.jsx`)

#### 🎨 CSS Modularizado
- Refatoração do `global.css` de **961 → 170 linhas** (entry point com `@import`)
- Criação de **12 módulos CSS** organizados em `components/` e `pages/`
- Build otimizado mantido em ~27 KB

#### 📄 Paginação Server-Side
- Centros de Custo (748 registros) e Contas Contábeis (278 registros) com paginação
- 20 itens por página com busca debounce (400ms)
- Layout compacto em tabela para grandes volumes de dados
- API retorna formato paginado ou completo conforme parâmetros

#### 🌱 Seed Unificado
- `seedImportar.js` importa C. Custo + Contas Contábeis de arquivos JSON
- Upsert previne duplicação em re-execuções
- Tratamento de 260 registros duplicados no JSON de contas contábeis

#### 🔧 Correções de Bugs
- **formatCNPJ / validarCNPJ**: adicionados null guards (`if (!value) return ''` e `String(value)`) para evitar `Cannot read properties of undefined`
- **Capa de Processo**: bordas uniformes com espessura 0.6pt e função `line()` unificada
- **Campos divididos**: CONTA/TIPO DE CONTA e CHAVE PIX/TIPO CHAVE PIX separados em linhas individuais

### v1.0.0 (Fevereiro 2026)

#### Formulário Condicional de Fornecedor
- Campos de pagamento exibidos condicionalmente baseado no tipo (TED/PIX/BOLETO)
- Dados limpos automaticamente ao trocar tipo de pagamento
- Forma de pagamento auto-preenchida na fatura a partir do cadastro do fornecedor

#### Mensagens de Erro no Login
- Backend retorna mensagens específicas (email não encontrado, usuário desativado, senha incorreta)
- Frontend exibe erros inline (caixa vermelha) + toast notification
- **Correção do toast sumindo**: interceptor 401 do Axios agora ignora requisições de login

#### Produção / Deploy
- Backend serve o build do frontend (`frontend/dist`) em produção
- Rota wildcard `app.get('*')` serve `index.html` para SPA routing
- Acesso externo via localtunnel sem necessidade de configuração de rede

---

## ⚙️ Variáveis de Ambiente (.env)

```env
DATABASE_URL="postgresql://postgres:hidroforte123@localhost:5432/hidroforte_erp"
JWT_SECRET="hidroforte-erp-secret-key-2026-mudar-em-producao"
JWT_EXPIRES_IN="8h"
PORT=3001
```

---

## 🔮 Próximos Passos (Planejado)

- [ ] Exportação de relatórios para Excel/PDF
- [ ] Notificações por email (aprovação, rejeição, pagamento)
- [ ] Dashboard avançado com filtros por período/filial
- [ ] Integração com sistemas de pagamento bancário
- [ ] Múltiplos anexos por fatura
- [ ] Histórico de alterações em cadastros
- [ ] Modo escuro (dark theme)
- [ ] Relatórios gráficos por fornecedor e centro de custo

---

## 📝 Licença

Projeto proprietário - Hidroforte © 2026
