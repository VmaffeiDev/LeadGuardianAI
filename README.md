# LeadGuardianAI

AI-powered Sales Operating System for automotive dealerships. Prevent lost leads, monitor sales teams in real time, automate lead distribution, and increase conversion with Artificial Intelligence.

SaaS multi-tenant de gestão inteligente de leads para equipes de vendas, começando pelo
mercado automotivo. Distribui leads automaticamente para o vendedor da vez, cronometra o
tempo sem resposta, dispara alertas em tempo real e dá ao gestor um dashboard ao vivo do
funil.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS** + componentes no estilo shadcn/ui
- **Prisma** + **PostgreSQL**
- **Auth.js (NextAuth v5)** — login por credenciais, sessão JWT, RBAC
- **Socket.IO** (servidor custom sobre o Next.js) + **Redis** — dashboard e alertas em tempo real
- **BullMQ** — worker de background que cronometra os leads e dispara alertas
- **Docker Compose** — stack completa self-hosted

## Arquitetura

Monorepo (pnpm workspaces + Turborepo):

```
apps/
  web/       Next.js (App Router) + servidor custom com Socket.IO
  worker/    processo de background (BullMQ) que varre leads parados
packages/
  db/        schema Prisma, migrations, seed
  core/      domínio compartilhado entre web e worker (distribuição round-robin,
             regras de alerta, RBAC, ranking/métricas) — testado com Vitest
```

`apps/web` e `apps/worker` compartilham exatamente a mesma lógica de negócio via
`@leadguardian/core`, evitando duas implementações divergentes do algoritmo de
distribuição/alertas. O isolamento multi-tenant é centralizado em uma Prisma Client
Extension (`@leadguardian/core/tenancy`) que injeta `tenantId` automaticamente em toda
query de modelo pertencente a um tenant.

## Papéis (RBAC)

| Papel | Pode |
|---|---|
| **Admin** | Tudo do Gestor + gerenciar configurações do tenant (limites de alerta) |
| **Gestor** | Dashboard em tempo real, ranking, métricas, ver/reatribuir todos os leads, gerenciar vendedores |
| **Tratador de Leads** | Cadastrar leads (entram automaticamente na distribuição round-robin) |
| **Vendedor** | Ver e trabalhar apenas os próprios leads, atualizar status, registrar contato |

## Rodando com Docker Compose (recomendado)

Pré-requisitos: Docker e Docker Compose.

```bash
cp .env.example .env
# edite .env e defina AUTH_SECRET (ex: openssl rand -base64 32)

docker compose up -d --build          # sobe postgres, redis, web e worker
docker compose --profile seed run --rm seed   # popula o tenant demo + usuários de teste
```

A aplicação fica em `http://localhost:3000`. Migrations rodam automaticamente (serviço
`migrate`) antes de `web`/`worker` subirem.

## Rodando localmente (sem Docker)

Pré-requisitos: Node 20+, pnpm, PostgreSQL e Redis rodando localmente.

```bash
pnpm install

# configure as variáveis de ambiente
cp packages/db/.env.example packages/db/.env         # DATABASE_URL
cp apps/web/.env.example apps/web/.env.local          # DATABASE_URL, REDIS_URL, AUTH_SECRET
cp apps/worker/.env.example apps/worker/.env          # DATABASE_URL, REDIS_URL
# edite os três e defina um AUTH_SECRET em apps/web/.env.local (ex: openssl rand -base64 32)

pnpm db:migrate     # aplica o schema
pnpm db:seed        # popula tenant demo + usuários de teste

pnpm --filter @leadguardian/web dev     # http://localhost:3000
pnpm --filter @leadguardian/worker dev  # cronômetro/alertas em background
```

## Usuários de teste (seed)

Todos com a senha **`Demo@123`**, no tenant "Concessionária Demo":

| Papel | E-mail |
|---|---|
| Admin | `admin@demo.com` |
| Gestor | `gestor@demo.com` |
| Tratador de Leads | `tratador@demo.com` |
| Vendedor | `vendedor1@demo.com` … `vendedor4@demo.com` |

O seed também cria ~12 leads em idades variadas (alguns recém-criados, alguns já em
estado de aviso/crítico) para o dashboard e o ranking já nascerem com dados.

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `DATABASE_URL` | db, web, worker | Connection string do PostgreSQL |
| `REDIS_URL` | web, worker | Connection string do Redis |
| `AUTH_SECRET` | web | Segredo usado para assinar a sessão JWT |
| `AUTH_URL` | web | Deixe vazio em HTTP puro; defina `https://...` quando houver TLS na frente (ativa o cookie `__Secure-`) |
| `PORT` | web | Porta do servidor Next.js (padrão 3000) |

## Scripts principais

```bash
pnpm dev                # turbo run dev em todos os apps
pnpm build               # build de produção de todos os apps
pnpm test                # testes (Vitest) de @leadguardian/core
pnpm typecheck            # tsc --noEmit em todo o monorepo
pnpm db:migrate           # prisma migrate dev
pnpm db:seed              # popular dados de teste
pnpm db:studio            # Prisma Studio
```

## O que está no MVP vs. V2

**MVP (implementado):** login, RBAC de 4 papéis, cadastro de vendedores e leads,
distribuição round-robin automática, cronômetro de tempo sem resposta, alertas in-app
em tempo real (aviso → crítico, com escalonamento ao gestor), dashboard do gestor ao
vivo, timeline/histórico por lead, status do lead, ranking de vendedores, tempo médio
de resposta.

**Fica para V2:** alertas por e-mail/WhatsApp/SMS, captação automática de leads
(Facebook Lead Ads, formulário de site, importação em massa), regras de distribuição
avançadas (por especialidade, por carga), Row-Level Security nativa no Postgres,
billing/assinatura, relatórios exportáveis, automação de follow-up, auditoria completa
(LGPD), SSO/SAML, app mobile/PWA, suíte completa de testes e2e.
