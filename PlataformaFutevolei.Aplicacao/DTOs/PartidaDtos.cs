namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarPartidaDto(
    Guid CategoriaCompeticaoId,
    Guid DuplaAId,
    Guid DuplaBId,
    int PlacarDuplaA,
    int PlacarDuplaB,
    Guid DuplaVencedoraId,
    DateTime DataPartida,
    string? Observacoes
);

public record AtualizarPartidaDto(
    Guid CategoriaCompeticaoId,
    Guid DuplaAId,
    Guid DuplaBId,
    int PlacarDuplaA,
    int PlacarDuplaB,
    Guid DuplaVencedoraId,
    DateTime DataPartida,
    string? Observacoes
);

public record PartidaDto(
    Guid Id,
    Guid CategoriaCompeticaoId,
    string NomeCategoria,
    Guid DuplaAId,
    string NomeDuplaA,
    Guid DuplaBId,
    string NomeDuplaB,
    int PlacarDuplaA,
    int PlacarDuplaB,
    Guid DuplaVencedoraId,
    string NomeDuplaVencedora,
    DateTime DataPartida,
    string? Observacoes,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
