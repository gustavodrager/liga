using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    Guid? LigaId,
    bool ContaRankingLiga,
    bool? InscricoesAbertas
);

public record AtualizarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    Guid? LigaId,
    bool ContaRankingLiga,
    bool? InscricoesAbertas
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
    bool InscricoesAbertas,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
