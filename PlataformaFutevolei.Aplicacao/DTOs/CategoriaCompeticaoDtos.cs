using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarCategoriaCompeticaoDto(
    Guid CompeticaoId,
    string Nome,
    GeneroCategoria Genero,
    NivelCategoria Nivel
);

public record AtualizarCategoriaCompeticaoDto(
    string Nome,
    GeneroCategoria Genero,
    NivelCategoria Nivel
);

public record CategoriaCompeticaoDto(
    Guid Id,
    Guid CompeticaoId,
    string NomeCompeticao,
    string Nome,
    GeneroCategoria Genero,
    NivelCategoria Nivel,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);
