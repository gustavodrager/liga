using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarCategoriaCompeticaoDto(
    Guid CompeticaoId,
    Guid? FormatoCampeonatoId,
    string Nome,
    GeneroCategoria Genero,
    NivelCategoria Nivel,
    decimal? PesoRanking
);

public record AtualizarCategoriaCompeticaoDto(
    Guid? FormatoCampeonatoId,
    string Nome,
    GeneroCategoria Genero,
    NivelCategoria Nivel,
    decimal? PesoRanking
);

public record CategoriaCompeticaoDto(
    Guid Id,
    Guid CompeticaoId,
    Guid? FormatoCampeonatoId,
    bool TabelaJogosAprovada,
    Guid? TabelaJogosAprovadaPorUsuarioId,
    DateTime? TabelaJogosAprovadaEmUtc,
    string NomeCompeticao,
    string? NomeFormatoCampeonato,
    string Nome,
    GeneroCategoria Genero,
    NivelCategoria Nivel,
    decimal PesoRanking,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
