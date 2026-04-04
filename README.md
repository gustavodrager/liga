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
EmailCodigoLogin__EmailOrigemSobrescrito=admin@quebranunca.com.br
EmailCodigoLogin__EmailDestinoSobrescrito=gustavodrager@gmail.com
```

Observações:

- A API falha na inicialização em `Production` se `Jwt:Chave` estiver vazia ou usando o placeholder do repositório.
- A API falha na inicialização em `Production` se `Frontend:Url` não estiver definida ou apontar para `localhost`.
- `EmailConvitesCadastro__ApiKey` e os dados de WhatsApp continuam opcionais; sem provedor configurado, o convite segue válido e o envio fica pendente/manual.
- `EmailCodigoLogin__EmailOrigemSobrescrito` e `EmailCodigoLogin__EmailDestinoSobrescrito` são opcionais e permitem redirecionar o código de login de um usuário específico para outro e-mail sem alterar o cadastro salvo no banco.
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

### Azure App Service + Key Vault

Para o cenário atual de produção, considere:

- Backend: Azure App Service
- Banco: Azure Database for PostgreSQL Flexible Server
- Segredos: Azure Key Vault
- Frontend: Azure Static Web Apps ou App Service separado

No App Service da API, mantenha em `Application settings` os valores não sensíveis:

```bash
ASPNETCORE_ENVIRONMENT=Production
Jwt__Emissor=PlataformaFutevolei.Api
Jwt__Audiencia=PlataformaFutevolei.Web
Jwt__ExpiracaoMinutos=120
Frontend__Url=https://app.seudominio.com
EmailConvitesCadastro__UrlApp=https://app.seudominio.com
WhatsappConvitesCadastro__UrlApp=https://app.seudominio.com
EmailConvitesCadastro__RemetenteEmail=plataforma@seudominio.com
EmailConvitesCadastro__RemetenteNome=Plataforma de Futevôlei
EmailConvitesCadastro__ReplyTo=contato@seudominio.com
EmailCodigoLogin__EmailOrigemSobrescrito=admin@quebranunca.com.br
EmailCodigoLogin__EmailDestinoSobrescrito=gustavodrager@gmail.com
Database__MigrateOnStartup=false
Diagnostics__EnableSwagger=false
Diagnostics__EnableDbTestEndpoint=false
WhatsappConvitesCadastro__Enabled=false
```

Para segredos sensíveis, prefira Key Vault References no mesmo `Application settings`:

```bash
ConnectionStrings__DefaultConnection=@Microsoft.KeyVault(SecretUri=https://SEU-VAULT.vault.azure.net/secrets/prod-db-connection-string)
Jwt__Chave=@Microsoft.KeyVault(SecretUri=https://SEU-VAULT.vault.azure.net/secrets/prod-jwt-chave)
EmailConvitesCadastro__ApiKey=@Microsoft.KeyVault(SecretUri=https://SEU-VAULT.vault.azure.net/secrets/prod-resend-api-key)
```

Fluxo resumido:

1. Criar os `Secrets` no Key Vault.
2. Ativar `System assigned managed identity` no App Service da API.
3. Dar a role `Key Vault Secrets User` para essa identidade no Key Vault.
4. Configurar as `Application settings` no App Service usando valores normais e Key Vault References.
5. Reiniciar o App Service após salvar as configurações.

Observações importantes:

- Não reutilize credenciais de desenvolvimento em produção; gere e rotacione chaves próprias de produção.
- O login principal do frontend depende de envio de código por e-mail. Sem `EmailConvitesCadastro__ApiKey` e remetente válidos, o uso normal do app fica comprometido.
- Quando `EmailCodigoLogin__EmailOrigemSobrescrito` e `EmailCodigoLogin__EmailDestinoSobrescrito` estiverem preenchidos, a API envia o código de login para o destino sobrescrito, mas continua validando e autenticando o usuário pelo e-mail cadastrado originalmente.
- O fluxo de `esqueci minha senha` ainda depende de evolução adicional para envio efetivo do código por e-mail.

### Domínio customizado

Se o frontend for publicado em um subdomínio, o DNS precisa existir antes do app abrir publicamente. Para App Service, o caso comum de subdomínio é:

- `CNAME` de `app` apontando para `<nome-do-app>.azurewebsites.net`
- `TXT` de validação `asuid.app` com o valor informado na tela de `Custom domains`

Depois de validar o domínio no Azure:

1. associar o domínio customizado ao App Service
2. emitir o certificado gerenciado
3. forçar HTTPS

Erro `DNS_PROBE_FINISHED_NXDOMAIN` indica ausência do registro DNS público, não falha da aplicação.

### Bootstrap inicial

O primeiro usuário `Administrador` precisa ser criado fora do fluxo normal da aplicação. Hoje:

- convites de cadastro exigem autenticação de administrador
- cadastro público está desativado
- o fluxo atual de convite cria apenas usuário com perfil `Organizador`

Planeje o bootstrap inicial do administrador diretamente no banco ou por processo operacional controlado antes do go-live.

## Autenticação

Endpoints:

- `POST /api/autenticacao/registrar`
- `POST /api/autenticacao/login`
- `GET /api/autenticacao/me`

Use o token JWT no header:

```text
Authorization: Bearer <token>
```
