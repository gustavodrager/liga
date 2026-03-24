using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record RankingCategoriaDto(
    Guid CategoriaId,
    Guid CompeticaoId,
    string NomeCompeticao,
    string NomeCategoria,
    GeneroCategoria? Genero,
    IReadOnlyList<RankingAtletaDto> Atletas
);

public record RankingAtletaDto(
    int Posicao,
    Guid AtletaId,
    string NomeAtleta,
    string? ApelidoAtleta,
    LadoAtleta Lado,
    int Jogos,
    int Vitorias,
    int Derrotas,
    int Empates,
    decimal Pontos,
    IReadOnlyList<RankingPartidaDto> Partidas
);

public record RankingPartidaDto(
    Guid PartidaId,
    string Confronto,
    DateTime DataPartida,
    string NomeCompeticao,
    string NomeCategoria,
    string Resultado,
    decimal Pontos
);
