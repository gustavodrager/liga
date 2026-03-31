using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class ConviteCadastroRepositorio(PlataformaFutevoleiDbContext dbContext) : IConviteCadastroRepositorio
{
    public async Task<IReadOnlyList<ConviteCadastro>> ListarAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.ConvitesCadastro
            .AsNoTracking()
            .Include(x => x.CriadoPorUsuario)
            .OrderByDescending(x => x.DataCriacao)
            .ToListAsync(cancellationToken);
    }

    public Task<ConviteCadastro?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.ConvitesCadastro
            .AsNoTracking()
            .Include(x => x.CriadoPorUsuario)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<ConviteCadastro?> ObterPorIdParaAtualizacaoAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.ConvitesCadastro
            .Include(x => x.CriadoPorUsuario)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<ConviteCadastro?> ObterPorTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        return dbContext.ConvitesCadastro
            .AsNoTracking()
            .Include(x => x.CriadoPorUsuario)
            .FirstOrDefaultAsync(x => x.Token == token, cancellationToken);
    }

    public Task<ConviteCadastro?> ObterPorTokenParaAtualizacaoAsync(string token, CancellationToken cancellationToken = default)
    {
        return dbContext.ConvitesCadastro
            .Include(x => x.CriadoPorUsuario)
            .FirstOrDefaultAsync(x => x.Token == token, cancellationToken);
    }

    public async Task AdicionarAsync(ConviteCadastro conviteCadastro, CancellationToken cancellationToken = default)
    {
        await dbContext.ConvitesCadastro.AddAsync(conviteCadastro, cancellationToken);
    }

    public void Atualizar(ConviteCadastro conviteCadastro)
    {
        dbContext.ConvitesCadastro.Update(conviteCadastro);
    }
}
