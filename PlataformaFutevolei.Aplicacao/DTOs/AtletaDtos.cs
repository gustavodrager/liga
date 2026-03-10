namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarAtletaDto(
    string Nome,
    string? Apelido,
    string? Cidade
);

public record AtualizarAtletaDto(
    string Nome,
    string? Apelido,
    string? Cidade
);

public record AtletaDto(
    Guid Id,
    string Nome,
    string? Apelido,
    string? Cidade,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
