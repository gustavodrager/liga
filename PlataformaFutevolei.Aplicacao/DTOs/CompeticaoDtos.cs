using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim
);

public record AtualizarCompeticaoDto(
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim
);

public record CompeticaoDto(
    Guid Id,
    string Nome,
    TipoCompeticao Tipo,
    string? Descricao,
    DateTime DataInicio,
    DateTime? DataFim,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
