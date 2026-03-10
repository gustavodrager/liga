using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class PartidaRepositorio(PlataformaFutevoleiDbContext dbContext) : IPartidaRepositorio
{
    public async Task<IReadOnlyList<Partida>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Partidas
            .AsNoTracking()
            .Include(x => x.CategoriaCompeticao)
            .Include(x => x.DuplaA)
            .Include(x => x.DuplaB)
            .Include(x => x.DuplaVencedora)
            .Where(x => x.CategoriaCompeticaoId == categoriaId)
            .OrderByDescending(x => x.DataPartida)
            .ToListAsync(cancellationToken);
    }

    public Task<Partida?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Partidas
            .Include(x => x.CategoriaCompeticao)
            .Include(x => x.DuplaA)
            .Include(x => x.DuplaB)
            .Include(x => x.DuplaVencedora)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AdicionarAsync(Partida partida, CancellationToken cancellationToken = default)
    {
        await dbContext.Partidas.AddAsync(partida, cancellationToken);
    }

    public void Atualizar(Partida partida)
    {
        dbContext.Partidas.Update(partida);
    }

    public void Remover(Partida partida)
    {
        dbContext.Partidas.Remove(partida);
    }
}
