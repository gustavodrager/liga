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
            .Include(x => x.Liga)
            .Include(x => x.Local)
            .Include(x => x.RegraCompeticao)
            .OrderByDescending(x => x.DataInicio)
            .ToListAsync(cancellationToken);
    }

    public Task<Competicao?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Competicoes
            .Include(x => x.Liga)
            .Include(x => x.Local)
            .Include(x => x.RegraCompeticao)
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
