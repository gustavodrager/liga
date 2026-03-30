using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class PartidaRepositorio(PlataformaFutevoleiDbContext dbContext) : IPartidaRepositorio
{
    public async Task<IReadOnlyList<Partida>> ListarPorCompeticaoAsync(Guid competicaoId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Partidas
            .AsNoTracking()
            .Include(x => x.CategoriaCompeticao)
                .ThenInclude(x => x.Competicao)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta2)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta2)
            .Include(x => x.DuplaVencedora)
            .Where(x => x.CategoriaCompeticao.CompeticaoId == competicaoId)
            .OrderBy(x => x.CategoriaCompeticao.Nome)
            .ThenBy(x => x.Status)
            .ThenBy(x => x.FaseCampeonato)
            .ThenBy(x => x.DataPartida ?? DateTime.MaxValue)
            .ThenBy(x => x.DataCriacao)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Partida>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Partidas
            .AsNoTracking()
            .Include(x => x.CategoriaCompeticao)
                .ThenInclude(x => x.Competicao)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaA)
                .ThenInclude(x => x.Atleta2)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta1)
            .Include(x => x.DuplaB)
                .ThenInclude(x => x.Atleta2)
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

    public async Task<Guid?> ObterUltimaCompeticaoComPartidaEncerradaAsync(
        Guid? usuarioOrganizadorId,
        Guid? atletaId,
        CancellationToken cancellationToken = default)
    {
        var consulta = dbContext.Partidas
            .AsNoTracking()
            .Where(x => x.Status == StatusPartida.Encerrada);

        if (atletaId.HasValue)
        {
            consulta = consulta.Where(x =>
                x.DuplaA.Atleta1Id == atletaId.Value ||
                x.DuplaA.Atleta2Id == atletaId.Value ||
                x.DuplaB.Atleta1Id == atletaId.Value ||
                x.DuplaB.Atleta2Id == atletaId.Value);
        }
        else if (usuarioOrganizadorId.HasValue)
        {
            consulta = consulta.Where(x => x.CategoriaCompeticao.Competicao.UsuarioOrganizadorId == usuarioOrganizadorId.Value);
        }

        return await consulta
            .OrderByDescending(x => x.DataPartida ?? x.DataCriacao)
            .ThenByDescending(x => x.DataCriacao)
            .Select(x => (Guid?)x.CategoriaCompeticao.CompeticaoId)
            .FirstOrDefaultAsync(cancellationToken);
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
        var partidaPersistida = dbContext.ChangeTracker
            .Entries<Partida>()
            .FirstOrDefault(x => x.Entity.Id == partida.Id)?
            .Entity;

        if (partidaPersistida is not null)
        {
            dbContext.Partidas.Remove(partidaPersistida);
            return;
        }

        partida.CategoriaCompeticao = null!;
        partida.DuplaA = null!;
        partida.DuplaB = null!;
        partida.DuplaVencedora = null;
        dbContext.Entry(partida).State = EntityState.Deleted;
    }
}
