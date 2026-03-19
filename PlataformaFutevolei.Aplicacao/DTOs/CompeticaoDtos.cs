using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    Guid? LigaId,
    bool ContaRankingLiga
);

public record AtualizarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    Guid? LigaId,
    bool ContaRankingLiga
);

public record CompeticaoDto(
    Guid Id,
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    Guid? LigaId,
    string? NomeLiga,
    bool ContaRankingLiga,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
