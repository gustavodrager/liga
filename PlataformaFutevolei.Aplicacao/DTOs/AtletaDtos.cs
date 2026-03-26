using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarAtletaDto(
    string Nome,
    string? Apelido,
    string? Telefone,
    string? Email,
    string? Instagram,
    string? Cpf,
    bool CadastroPendente,
    LadoAtleta Lado,
    DateTime? DataNascimento
);

public record AtualizarAtletaDto(
    string Nome,
    string? Apelido,
    string? Telefone,
    string? Email,
    string? Instagram,
    string? Cpf,
    bool CadastroPendente,
    LadoAtleta Lado,
    DateTime? DataNascimento
);

public record AtletaResumoDto(
    Guid Id,
    string Nome,
    string? Apelido,
    string? Telefone,
    string? Email,
    string? Instagram,
    string? Cpf,
    bool CadastroPendente
);

public record AtletaDto(
    Guid Id,
    string Nome,
    string? Apelido,
    string? Telefone,
    string? Email,
    string? Instagram,
    string? Cpf,
    bool CadastroPendente,
    LadoAtleta Lado,
    DateTime? DataNascimento,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
