using PlataformaFutevolei.Aplicacao.DTOs;

namespace PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

public interface IAtletaServico
{
    Task<IReadOnlyList<AtletaDto>> ListarAsync(CancellationToken cancellationToken = default);
    Task<AtletaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AtletaDto> CriarAsync(CriarAtletaDto dto, CancellationToken cancellationToken = default);
    Task<AtletaDto> AtualizarAsync(Guid id, AtualizarAtletaDto dto, CancellationToken cancellationToken = default);
    Task RemoverAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface IDuplaServico
{
    Task<IReadOnlyList<DuplaDto>> ListarAsync(CancellationToken cancellationToken = default);
    Task<DuplaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<DuplaDto> CriarAsync(CriarDuplaDto dto, CancellationToken cancellationToken = default);
    Task<DuplaDto> AtualizarAsync(Guid id, AtualizarDuplaDto dto, CancellationToken cancellationToken = default);
    Task RemoverAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface ICompeticaoServico
{
    Task<IReadOnlyList<CompeticaoDto>> ListarAsync(CancellationToken cancellationToken = default);
    Task<CompeticaoDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CompeticaoDto> CriarAsync(CriarCompeticaoDto dto, CancellationToken cancellationToken = default);
    Task<CompeticaoDto> AtualizarAsync(Guid id, AtualizarCompeticaoDto dto, CancellationToken cancellationToken = default);
    Task RemoverAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface ICategoriaCompeticaoServico
{
    Task<IReadOnlyList<CategoriaCompeticaoDto>> ListarPorCompeticaoAsync(Guid competicaoId, CancellationToken cancellationToken = default);
    Task<CategoriaCompeticaoDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CategoriaCompeticaoDto> CriarAsync(CriarCategoriaCompeticaoDto dto, CancellationToken cancellationToken = default);
    Task<CategoriaCompeticaoDto> AtualizarAsync(Guid id, AtualizarCategoriaCompeticaoDto dto, CancellationToken cancellationToken = default);
    Task RemoverAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface IPartidaServico
{
    Task<IReadOnlyList<PartidaDto>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default);
    Task<PartidaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PartidaDto> CriarAsync(CriarPartidaDto dto, CancellationToken cancellationToken = default);
    Task<PartidaDto> AtualizarAsync(Guid id, AtualizarPartidaDto dto, CancellationToken cancellationToken = default);
    Task RemoverAsync(Guid id, CancellationToken cancellationToken = default);
}
