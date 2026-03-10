using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;

public interface IUsuarioRepositorio
{
    Task<Usuario?> ObterPorEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<Usuario?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Usuario usuario, CancellationToken cancellationToken = default);
}

public interface IAtletaRepositorio
{
    Task<IReadOnlyList<Atleta>> ListarAsync(CancellationToken cancellationToken = default);
    Task<Atleta?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Atleta atleta, CancellationToken cancellationToken = default);
    void Atualizar(Atleta atleta);
    void Remover(Atleta atleta);
}

public interface IDuplaRepositorio
{
    Task<IReadOnlyList<Dupla>> ListarAsync(CancellationToken cancellationToken = default);
    Task<Dupla?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Dupla?> ObterPorAtletasAsync(Guid atleta1Id, Guid atleta2Id, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Dupla dupla, CancellationToken cancellationToken = default);
    void Atualizar(Dupla dupla);
    void Remover(Dupla dupla);
}

public interface ICompeticaoRepositorio
{
    Task<IReadOnlyList<Competicao>> ListarAsync(CancellationToken cancellationToken = default);
    Task<Competicao?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Competicao competicao, CancellationToken cancellationToken = default);
    void Atualizar(Competicao competicao);
    void Remover(Competicao competicao);
}

public interface ICategoriaCompeticaoRepositorio
{
    Task<IReadOnlyList<CategoriaCompeticao>> ListarPorCompeticaoAsync(Guid competicaoId, CancellationToken cancellationToken = default);
    Task<CategoriaCompeticao?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AdicionarAsync(CategoriaCompeticao categoria, CancellationToken cancellationToken = default);
    void Atualizar(CategoriaCompeticao categoria);
    void Remover(CategoriaCompeticao categoria);
}

public interface IPartidaRepositorio
{
    Task<IReadOnlyList<Partida>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default);
    Task<Partida?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Partida partida, CancellationToken cancellationToken = default);
    void Atualizar(Partida partida);
    void Remover(Partida partida);
}

public interface IUnidadeTrabalho
{
    Task<int> SalvarAlteracoesAsync(CancellationToken cancellationToken = default);
}
