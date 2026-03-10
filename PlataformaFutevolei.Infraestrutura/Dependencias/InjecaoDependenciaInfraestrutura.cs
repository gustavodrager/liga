using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Infraestrutura.Configuracoes;
using PlataformaFutevolei.Infraestrutura.Persistencia;
using PlataformaFutevolei.Infraestrutura.Repositorios;
using PlataformaFutevolei.Infraestrutura.Seguranca;

namespace PlataformaFutevolei.Infraestrutura.Dependencias;

public static class InjecaoDependenciaInfraestrutura
{
    public static IServiceCollection AdicionarInfraestrutura(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Padrao");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'Padrao' não foi configurada.");
        }

        services.AddDbContext<PlataformaFutevoleiDbContext>(options =>
            options.UseNpgsql(connectionString)
        );

        var secaoJwt = configuration.GetSection(ConfiguracaoJwt.Secao);
        var expiracaoMinutos = int.TryParse(secaoJwt["ExpiracaoMinutos"], out var valorExpiracao)
            ? valorExpiracao
            : 120;

        var jwt = new ConfiguracaoJwt
        {
            Chave = secaoJwt["Chave"] ?? string.Empty,
            Emissor = secaoJwt["Emissor"] ?? "PlataformaFutevolei",
            Audiencia = secaoJwt["Audiencia"] ?? "PlataformaFutevolei.Web",
            ExpiracaoMinutos = expiracaoMinutos
        };
        services.Configure<ConfiguracaoJwt>(options =>
        {
            options.Chave = jwt.Chave;
            options.Emissor = jwt.Emissor;
            options.Audiencia = jwt.Audiencia;
            options.ExpiracaoMinutos = jwt.ExpiracaoMinutos;
        });

        services.AddScoped<IUnidadeTrabalho, UnidadeTrabalho>();
        services.AddScoped<IUsuarioRepositorio, UsuarioRepositorio>();
        services.AddScoped<IAtletaRepositorio, AtletaRepositorio>();
        services.AddScoped<IDuplaRepositorio, DuplaRepositorio>();
        services.AddScoped<ICompeticaoRepositorio, CompeticaoRepositorio>();
        services.AddScoped<ICategoriaCompeticaoRepositorio, CategoriaCompeticaoRepositorio>();
        services.AddScoped<IPartidaRepositorio, PartidaRepositorio>();

        services.AddScoped<ISenhaServico, SenhaServicoBcrypt>();
        services.AddScoped<ITokenJwtServico, TokenJwtServico>();

        return services;
    }
}
