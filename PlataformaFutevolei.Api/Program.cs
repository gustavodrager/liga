using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PlataformaFutevolei.Api.Middlewares;
using PlataformaFutevolei.Api.Seguranca;
using PlataformaFutevolei.Aplicacao.Dependencias;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Infraestrutura.Configuracoes;
using PlataformaFutevolei.Infraestrutura.Dependencias;
using PlataformaFutevolei.Infraestrutura.Persistencia;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true);

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>(optional: true, reloadOnChange: true);
}

builder.Configuration.AddEnvironmentVariables();

var applicationInsightsConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
if (string.IsNullOrWhiteSpace(applicationInsightsConnectionString))
{
    applicationInsightsConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
}

if (!string.IsNullOrWhiteSpace(applicationInsightsConnectionString))
{
    builder.Services.AddApplicationInsightsTelemetry(builder.Configuration);
}

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var configuracaoJwt = builder.Configuration.GetSection(ConfiguracaoJwt.Secao).Get<ConfiguracaoJwt>()
    ?? new ConfiguracaoJwt();

if (string.IsNullOrWhiteSpace(configuracaoJwt.Chave))
{
    throw new InvalidOperationException(
        "A configuração JWT está incompleta. Defina Jwt:Chave (ou a variável de ambiente Jwt__Chave).");
}

builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUsuarioContexto, UsuarioContextoHttp>();
builder.Services.AdicionarAplicacao();
builder.Services.AdicionarInfraestrutura(builder.Configuration);

var origemFrontendConfigurada = builder.Configuration.GetValue<string>("Frontend:Url");
var origensFrontend = string.IsNullOrWhiteSpace(origemFrontendConfigurada)
    ? new[] { "http://localhost:5173" }
    : origemFrontendConfigurada
        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

if (builder.Environment.IsProduction())
{
    if (EhChaveJwtPadrao(configuracaoJwt.Chave))
    {
        throw new InvalidOperationException(
            "A configuração JWT de produção está inválida. Defina uma chave forte em Jwt:Chave " +
            "(ou Jwt__Chave) e não utilize o placeholder do repositório.");
    }

    if (string.IsNullOrWhiteSpace(origemFrontendConfigurada) || origensFrontend.Any(EhOrigemInvalidaParaProducao))
    {
        throw new InvalidOperationException(
            "A configuração Frontend:Url é obrigatória em produção e não pode apontar para localhost. " +
            "Defina Frontend:Url (ou Frontend__Url) com a URL pública do frontend.");
    }
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins(origensFrontend)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = configuracaoJwt.Emissor,
            ValidAudience = configuracaoJwt.Audiencia,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuracaoJwt.Chave)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Plataforma Futevôlei API",
        Version = "v1"
    });

    var esquemaJwt = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Informe o token JWT no formato: Bearer {token}"
    };

    options.AddSecurityDefinition("Bearer", esquemaJwt);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { esquemaJwt, Array.Empty<string>() }
    });
});

var app = builder.Build();

app.Logger.LogInformation("Inicializando API no ambiente {Ambiente}.", app.Environment.EnvironmentName);
app.Logger.LogInformation("Origens CORS configuradas: {Origens}.", string.Join(", ", origensFrontend));
app.Logger.LogInformation(
    !string.IsNullOrWhiteSpace(applicationInsightsConnectionString)
        ? "Application Insights habilitado."
        : "Application Insights desabilitado. Defina ApplicationInsights:ConnectionString ou APPLICATIONINSIGHTS_CONNECTION_STRING para habilitar a telemetria.");

var habilitarSwagger = builder.Configuration.GetValue("Diagnostics:EnableSwagger", true);
if (habilitarSwagger)
{
    app.Logger.LogInformation("Swagger habilitado temporariamente para validação inicial do deploy.");
}
else
{
    app.Logger.LogInformation("Swagger desabilitado por configuração.");
}

var habilitarDbTestEndpoint = builder.Configuration.GetValue("Diagnostics:EnableDbTestEndpoint", true);
if (!habilitarDbTestEndpoint)
{
    app.Logger.LogInformation("Endpoint /db-test desabilitado por configuração.");
}

var aplicarMigrations = builder.Configuration.GetValue("Database:MigrateOnStartup", true);
if (aplicarMigrations)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<PlataformaFutevoleiDbContext>();

    try
    {
        app.Logger.LogInformation("Aplicando migrations pendentes...");
        dbContext.Database.Migrate();
        GarantirCompatibilidadeStatusAprovacaoPartidas(dbContext, app.Logger);
        app.Logger.LogInformation("Migrations aplicadas com sucesso.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Falha ao aplicar migrations na inicialização.");
    }
}
else
{
    app.Logger.LogInformation("Execução de migrations na inicialização desabilitada por configuração.");
}

app.UseForwardedHeaders();

app.UseMiddleware<MiddlewareTratamentoErros>();

if (habilitarSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", (IHostEnvironment environment) =>
{
    return Results.Ok(new
    {
        status = "ok",
        ambiente = environment.EnvironmentName,
        utc = DateTime.UtcNow
    });
});

if (habilitarDbTestEndpoint)
{
    app.MapGet("/db-test", async (PlataformaFutevoleiDbContext dbContext, CancellationToken cancellationToken) =>
    {
        try
        {
            var conectou = await dbContext.Database.CanConnectAsync(cancellationToken);
            if (!conectou)
            {
                return Results.Problem(
                    title: "Banco indisponível.",
                    detail: "Não foi possível conectar ao PostgreSQL.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            return Results.Ok(new
            {
                status = "ok",
                banco = "conectado",
                utc = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Falha na conexão com banco.",
                detail: ex.Message,
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    });
}

app.MapControllers();

app.Run();

static bool EhChaveJwtPadrao(string? chave)
{
    return string.IsNullOrWhiteSpace(chave) ||
           chave.Contains("MUDAR_EM_PRODUCAO", StringComparison.OrdinalIgnoreCase);
}

static bool EhOrigemInvalidaParaProducao(string origem)
{
    if (!Uri.TryCreate(origem, UriKind.Absolute, out var uri))
    {
        return true;
    }

    return uri.IsLoopback;
}

static void GarantirCompatibilidadeStatusAprovacaoPartidas(
    PlataformaFutevoleiDbContext dbContext,
    ILogger logger)
{
    dbContext.Database.ExecuteSqlRaw("""
        ALTER TABLE partidas
        ADD COLUMN IF NOT EXISTS status_aprovacao integer NOT NULL DEFAULT 3;
        """);

    dbContext.Database.ExecuteSqlRaw("""
        CREATE INDEX IF NOT EXISTS "IX_partidas_status_aprovacao"
        ON partidas (status_aprovacao);
        """);

    logger.LogInformation("Compatibilidade de schema para partidas.status_aprovacao verificada.");
}
