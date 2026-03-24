using Microsoft.Extensions.DependencyInjection;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Servicos;

namespace PlataformaFutevolei.Aplicacao.Dependencias;

public static class InjecaoDependenciaAplicacao
{
    public static IServiceCollection AdicionarAplicacao(this IServiceCollection services)
    {
        services.AddScoped<IAutenticacaoServico, AutenticacaoServico>();
        services.AddScoped<IAtletaServico, AtletaServico>();
        services.AddScoped<ILigaServico, LigaServico>();
        services.AddScoped<ILocalServico, LocalServico>();
        services.AddScoped<IFormatoCampeonatoServico, FormatoCampeonatoServico>();
        services.AddScoped<IRegraCompeticaoServico, RegraCompeticaoServico>();
        services.AddScoped<IDuplaServico, DuplaServico>();
        services.AddScoped<ICompeticaoServico, CompeticaoServico>();
        services.AddScoped<ICategoriaCompeticaoServico, CategoriaCompeticaoServico>();
        services.AddScoped<IInscricaoCampeonatoServico, InscricaoCampeonatoServico>();
        services.AddScoped<IPartidaServico, PartidaServico>();
        services.AddScoped<IRankingServico, RankingServico>();
        services.AddScoped<IImportacaoServico, ImportacaoServico>();

        return services;
    }
}
