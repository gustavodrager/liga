using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarLocalDto(
    string Nome,
    TipoLocal Tipo,
    int QuantidadeQuadras
);

public record AtualizarLocalDto(
    string Nome,
    TipoLocal Tipo,
    int QuantidadeQuadras
);

public record LocalDto(
    Guid Id,
    string Nome,
    TipoLocal Tipo,
    int QuantidadeQuadras,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
