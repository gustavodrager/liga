using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarPartidaDto(
    Guid CategoriaCompeticaoId,
    Guid DuplaAId,
    Guid DuplaBId,
    string? FaseCampeonato,
    StatusPartida Status,
    int? PlacarDuplaA,
    int? PlacarDuplaB,
    DateTime? DataPartida,
    string? Observacoes
);

public record AtualizarPartidaDto(
    Guid CategoriaCompeticaoId,
    Guid DuplaAId,
    Guid DuplaBId,
    string? FaseCampeonato,
    StatusPartida Status,
    int? PlacarDuplaA,
    int? PlacarDuplaB,
    DateTime? DataPartida,
    string? Observacoes
);

public record GerarTabelaCategoriaDto(
    bool SubstituirTabelaExistente = false
);

public record GeracaoTabelaCategoriaDto(
    Guid CategoriaId,
    string NomeCategoria,
    int QuantidadePartidasGeradas,
    bool SubstituiuTabelaExistente,
    string Resumo,
    IReadOnlyList<PartidaDto> Partidas
);

public record PartidaDto(
    Guid Id,
    Guid CategoriaCompeticaoId,
    string NomeCategoria,
    Guid DuplaAId,
    string NomeDuplaA,
    Guid DuplaBId,
    string NomeDuplaB,
    string? FaseCampeonato,
    StatusPartida Status,
    int PlacarDuplaA,
    int PlacarDuplaB,
    Guid? DuplaVencedoraId,
    string? NomeDuplaVencedora,
    decimal PesoRankingCategoria,
    decimal PontosRankingVitoria,
    DateTime? DataPartida,
    string? Observacoes,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
