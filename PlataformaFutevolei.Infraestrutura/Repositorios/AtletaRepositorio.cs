using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Utilitarios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class AtletaRepositorio(PlataformaFutevoleiDbContext dbContext) : IAtletaRepositorio
{
    public async Task<IReadOnlyList<Atleta>> ListarAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Atletas
            .AsNoTracking()
            .OrderBy(x => x.Nome)
            .ToListAsync(cancellationToken);
    }

    public Task<Atleta?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Atletas
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Atleta?> ObterPorNomeAsync(string nome, CancellationToken cancellationToken = default)
    {
        var nomeNormalizado = NormalizadorNomeAtleta.NormalizarTexto(nome);
        var chave = nomeNormalizado.ToLower();

        return dbContext.Atletas
            .FirstOrDefaultAsync(x => x.Nome.ToLower() == chave, cancellationToken);
    }

    public async Task AdicionarAsync(Atleta atleta, CancellationToken cancellationToken = default)
    {
        await dbContext.Atletas.AddAsync(atleta, cancellationToken);
    }

    public void Atualizar(Atleta atleta)
    {
        dbContext.Atletas.Update(atleta);
    }

    public void Remover(Atleta atleta)
    {
        dbContext.Atletas.Remove(atleta);
    }
}
