using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    Guid? LigaId,
    Guid? LocalId,
    Guid? RegraCompeticaoId,
    bool? InscricoesAbertas
);

public record AtualizarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    Guid? LigaId,
    Guid? LocalId,
    Guid? RegraCompeticaoId,
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
    Guid? LocalId,
    Guid? RegraCompeticaoId,
    string? NomeLiga,
    string? NomeLocal,
    string? NomeRegraCompeticao,
    bool ContaRankingLiga,
    bool InscricoesAbertas,
    int PontosMinimosPartidaEfetivo,
    int DiferencaMinimaPartidaEfetiva,
    bool PermiteEmpateEfetivo,
    decimal PontosVitoriaEfetivo,
    decimal PontosDerrotaEfetivo,
    decimal PontosParticipacaoEfetivo,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
