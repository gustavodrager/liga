using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class DuplaRepositorio(PlataformaFutevoleiDbContext dbContext) : IDuplaRepositorio
{
    public async Task<IReadOnlyList<Dupla>> ListarAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Duplas
            .AsNoTracking()
            .Include(x => x.Atleta1)
            .Include(x => x.Atleta2)
            .OrderBy(x => x.Nome)
            .ToListAsync(cancellationToken);
    }

    public Task<Dupla?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Duplas
            .Include(x => x.Atleta1)
            .Include(x => x.Atleta2)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Dupla?> ObterPorAtletasAsync(Guid atleta1Id, Guid atleta2Id, CancellationToken cancellationToken = default)
    {
        return dbContext.Duplas
            .FirstOrDefaultAsync(
                x => (x.Atleta1Id == atleta1Id && x.Atleta2Id == atleta2Id) ||
                     (x.Atleta1Id == atleta2Id && x.Atleta2Id == atleta1Id),
                cancellationToken
            );
    }

    public async Task AdicionarAsync(Dupla dupla, CancellationToken cancellationToken = default)
    {
        await dbContext.Duplas.AddAsync(dupla, cancellationToken);
    }

    public void Atualizar(Dupla dupla)
    {
        dbContext.Duplas.Update(dupla);
    }

    public void Remover(Dupla dupla)
    {
        dbContext.Duplas.Remove(dupla);
    }
}
