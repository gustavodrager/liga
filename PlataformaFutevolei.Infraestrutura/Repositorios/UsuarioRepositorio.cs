using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Persistencia;

namespace PlataformaFutevolei.Infraestrutura.Repositorios;

public class UsuarioRepositorio(PlataformaFutevoleiDbContext dbContext) : IUsuarioRepositorio
{
    public Task<Usuario?> ObterPorEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return dbContext.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public Task<Usuario?> ObterPorEmailParaAtualizacaoAsync(string email, CancellationToken cancellationToken = default)
    {
        return dbContext.Usuarios
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public Task<Usuario?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AdicionarAsync(Usuario usuario, CancellationToken cancellationToken = default)
    {
        await dbContext.Usuarios.AddAsync(usuario, cancellationToken);
    }

    public void Atualizar(Usuario usuario)
    {
        dbContext.Usuarios.Update(usuario);
    }
}
