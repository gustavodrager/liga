# Plataforma Futevôlei (MVP)

Plataforma web para registro de partidas de futevôlei com backend .NET 8 + PostgreSQL e frontend React/Vite.

## Estrutura

- `PlataformaFutevolei.Api`
- `PlataformaFutevolei.Aplicacao`
- `PlataformaFutevolei.Dominio`
- `PlataformaFutevolei.Infraestrutura`
- `frontend/web`

## Backend

1. Suba o PostgreSQL:

```bash
docker compose up -d
```

2. Ajuste a connection string em `PlataformaFutevolei.Api/appsettings.json` se necessário.
3. Execute a API:

```bash
dotnet run --project PlataformaFutevolei.Api
```

A API sobe em `http://localhost:5000` (perfil `http`) e aplica migrations automaticamente no startup.

## Frontend

```bash
cd frontend/web
npm install
npm run dev
```

Frontend em `http://localhost:5173`, com proxy para a API em `http://localhost:5000`.

## Autenticação

Endpoints:

- `POST /api/autenticacao/registrar`
- `POST /api/autenticacao/login`
- `GET /api/autenticacao/me`

Use o token JWT no header:

```text
Authorization: Bearer <token>
```