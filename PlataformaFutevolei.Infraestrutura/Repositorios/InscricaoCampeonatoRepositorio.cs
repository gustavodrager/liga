using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class InscricaoCampeonatoRepositorio(PlataformaFutevoleiDbContext dbContext) : IInscricaoCampeonatoRepositorio
{
    public async Task<IReadOnlyList<InscricaoCampeonato>> ListarPorCampeonatoAsync(
        Guid campeonatoId,
        Guid? categoriaId,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.InscricoesCampeonato
            .AsNoTracking()
            .Include(x => x.Competicao)
            .Include(x => x.CategoriaCompeticao)
            .Include(x => x.Atleta1)
            .Include(x => x.Atleta2)
            .Where(x => x.CompeticaoId == campeonatoId);

        if (categoriaId.HasValue)
        {
            query = query.Where(x => x.CategoriaCompeticaoId == categoriaId.Value);
        }

        return await query
            .OrderBy(x => x.CategoriaCompeticao.Nome)
            .ThenBy(x => x.Atleta1.Nome)
            .ThenBy(x => x.Atleta2.Nome)
            .ToListAsync(cancellationToken);
    }

    public Task<InscricaoCampeonato?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.InscricoesCampeonato
            .Include(x => x.Competicao)
            .Include(x => x.CategoriaCompeticao)
            .Include(x => x.Atleta1)
            .Include(x => x.Atleta2)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<InscricaoCampeonato?> ObterDuplicadaAsync(
        Guid categoriaId,
        Guid atleta1Id,
        Guid atleta2Id,
        CancellationToken cancellationToken = default)
    {
        return dbContext.InscricoesCampeonato
            .FirstOrDefaultAsync(
                x => x.CategoriaCompeticaoId == categoriaId &&
                     x.Atleta1Id == atleta1Id &&
                     x.Atleta2Id == atleta2Id,
                cancellationToken);
    }

    public async Task AdicionarAsync(InscricaoCampeonato inscricao, CancellationToken cancellationToken = default)
    {
        await dbContext.InscricoesCampeonato.AddAsync(inscricao, cancellationToken);
    }
}
