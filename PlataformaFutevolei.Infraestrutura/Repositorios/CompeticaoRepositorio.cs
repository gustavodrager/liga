using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class CompeticaoRepositorio(PlataformaFutevoleiDbContext dbContext) : ICompeticaoRepositorio
{
    public async Task<IReadOnlyList<Competicao>> ListarAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Competicoes
            .AsNoTracking()
            .OrderByDescending(x => x.DataInicio)
            .ToListAsync(cancellationToken);
    }

    public Task<Competicao?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Competicoes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AdicionarAsync(Competicao competicao, CancellationToken cancellationToken = default)
    {
        await dbContext.Competicoes.AddAsync(competicao, cancellationToken);
    }

    public void Atualizar(Competicao competicao)
    {
        dbContext.Competicoes.Update(competicao);
    }

    public void Remover(Competicao competicao)
    {
        dbContext.Competicoes.Remove(competicao);
    }
}
