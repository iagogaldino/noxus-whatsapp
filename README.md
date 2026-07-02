# noxus-whatsapp

Monorepo do Noxus WhatsApp — app Ionic/React com painel admin e backend Node.js.

## Estrutura

- `apps/frontend` — aplicativo WhatsApp + admin (Ionic 8, React 19, Vite)
- `apps/backend` — API REST (Node.js, TypeScript, Express, MongoDB)

## Pré-requisitos

- Node.js 20+
- MongoDB rodando localmente (ex.: `mongodb://localhost:27017`) ou MongoDB Atlas

## Backend

```bash
cd apps/backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run seed           # cria usuários demo
npm run dev            # http://localhost:3001
```

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Healthcheck |
| POST | `/api/v1/auth/login` | Login `{ email, password }` |
| GET | `/api/v1/auth/me` | Sessão atual (Bearer token) |

### Contas de demonstração (seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@noxus.dev | admin123 |
| Funcionário | ana.silva@noxus.dev | ana123 |
| Funcionário (inativo) | joao.santos@noxus.dev | joao123 |

## Frontend

Com o backend rodando:

```bash
cd apps/frontend
npm install
cp .env.example .env   # opcional; proxy Vite usa /api → :3001
npm run dev            # http://localhost:5173
```

O login usa exclusivamente a API (`POST /api/v1/auth/login`). Em dev, o Vite faz proxy de `/api` para `http://localhost:3001`.

## Build

```bash
cd apps/backend && npm run build
cd apps/frontend && npm run build
```
