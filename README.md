# Plataforma Futevôlei (MVP)

Plataforma web para registro de partidas de futevôlei com backend .NET 8 + PostgreSQL e frontend React/Vite.

## Estrutura

- `PlataformaFutevolei.Api`
- `PlataformaFutevolei.Aplicacao`
- `PlataformaFutevolei.Dominio`
- `PlataformaFutevolei.Infraestrutura`
- `frontend/web`

## Docker

O repositório agora possui Docker para banco, API e frontend.

1. Opcionalmente, copie `/.env.example` para `/.env` e ajuste as portas/credenciais.
2. Suba a stack completa:

```bash
docker compose up --build -d
```

Serviços padrão:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5080`
- Swagger: `http://localhost:5080/swagger`
- PostgreSQL: `localhost:55432`

Observações:

- A API sobe no container em `Development` para manter o fluxo local e aceitar origens `localhost`.
- O frontend Docker usa proxy interno em `/api`, então não depende de URL pública da API no build.
- Se quiser apenas o banco para desenvolvimento manual, rode `docker compose up -d postgres`.

## Backend local

1. Suba o PostgreSQL com Docker:

```bash
docker compose up -d postgres
```

2. Ajuste a connection string em `PlataformaFutevolei.Api/appsettings.json` se necessário.
3. Execute a API:

```bash
dotnet run --project PlataformaFutevolei.Api
```

A API sobe em `http://localhost:5000` (perfil `http`) e aplica migrations automaticamente no startup. O `appsettings.json` do repositório já aponta para `localhost:55432`, compatível com o `docker compose`.

## Frontend local

```bash
cd frontend/web
npm install
npm run dev
```

Frontend em `http://localhost:5173`.
O repositório já traz `VITE_API_URL=http://localhost:5080` em `frontend/web/.env`; ajuste conforme a porta em que a API estiver rodando. Se preferir usar `/api` no Vite, remova a variável e use o proxy configurado em `vite.config.js`.

## Produção

O backend já possui `appsettings.Production.json` com defaults mais seguros:

- `Database:MigrateOnStartup=false`
- `Diagnostics:EnableSwagger=false`
- `Diagnostics:EnableDbTestEndpoint=false`

Em produção, configure via variáveis de ambiente pelo menos:

```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Host=...;Port=5432;Database=...;Username=...;Password=...;Ssl Mode=Require;Trust Server Certificate=true
Jwt__Chave=uma-chave-forte-e-unica
Jwt__Emissor=PlataformaFutevolei.Api
Jwt__Audiencia=PlataformaFutevolei.Web
Frontend__Url=https://app.seudominio.com
EmailConvitesCadastro__UrlApp=https://app.seudominio.com
WhatsappConvitesCadastro__UrlApp=https://app.seudominio.com
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=https://...
```

Observações:

- A API falha na inicialização em `Production` se `Jwt:Chave` estiver vazia ou usando o placeholder do repositório.
- A API falha na inicialização em `Production` se `Frontend:Url` não estiver definida ou apontar para `localhost`.
- `EmailConvitesCadastro__ApiKey` e os dados de WhatsApp continuam opcionais; sem provedor configurado, o convite segue válido e o envio fica pendente/manual.
- Application Insights é opcional; quando `ApplicationInsights:ConnectionString` ou `APPLICATIONINSIGHTS_CONNECTION_STRING` estiver configurada, a API envia requests, dependências, exceções e logs do `ILogger` para o recurso.

Publicação sugerida do backend:

```bash
dotnet publish PlataformaFutevolei.Api -c Release -o ./publish
```

Para o frontend, use `frontend/web/.env.production.example` como base e defina uma das opções:

- `VITE_API_URL=https://api.seudominio.com`
- `VITE_API_BASE_URL=https://app.seudominio.com/api`

Build do frontend:

```bash
cd frontend/web
npm run build
```

## Autenticação

Endpoints:

- `POST /api/autenticacao/registrar`
- `POST /api/autenticacao/login`
- `GET /api/autenticacao/me`

Use o token JWT no header:

```text
Authorization: Bearer <token>
```
