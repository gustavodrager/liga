using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class PartidaRepositorio(PlataformaFutevoleiDbContext dbContext) : IPartidaRepositorio
{
    public async Task<IReadOnlyList<Partida>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Partidas
            .AsNoTracking()
            .Include(x => x.CategoriaCompeticao)
                .ThenInclude(x => x.Competicao)
            .Include(x => x.DuplaA)
            .Include(x => x.DuplaB)
            .Include(x => x.DuplaVencedora)
            .Where(x => x.CategoriaCompeticaoId == categoriaId)
            .OrderBy(x => x.Status)
            .ThenBy(x => x.FaseCampeonato)
            .ThenBy(x => x.DataPartida ?? DateTime.MaxValue)
            .ThenBy(x => x.DataCriacao)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Partida>> ListarParaRankingPorLigaAsync(Guid ligaId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Partidas
            .AsNoTracking()
            .Include(x => x.CategoriaCompeticao)
                .ThenInclude(x => x.Competicao)
                    .ThenInclude(x => x.RegraCompeticao)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta2)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta2)
            .Where(x => x.Status == StatusPartida.Encerrada)
            .Where(x => x.CategoriaCompeticao.Competicao.LigaId == ligaId)
            .OrderByDescending(x => x.DataPartida)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Partida>> ListarParaRankingPorCompeticaoAsync(Guid competicaoId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Partidas
            .AsNoTracking()
            .Include(x => x.CategoriaCompeticao)
                .ThenInclude(x => x.Competicao)
                    .ThenInclude(x => x.RegraCompeticao)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta2)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta2)
            .Where(x => x.Status == StatusPartida.Encerrada)
            .Where(x => x.CategoriaCompeticao.CompeticaoId == competicaoId)
            .OrderByDescending(x => x.DataPartida)
            .ToListAsync(cancellationToken);
    }

    public Task<Partida?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Partidas
            .Include(x => x.CategoriaCompeticao)
                .ThenInclude(x => x.Competicao)
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
