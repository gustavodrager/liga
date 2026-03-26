using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record RegistrarUsuarioRequisicaoDto(
    string Nome,
    string Email,
    string Senha,
    PerfilUsuario Perfil = PerfilUsuario.Atleta
);

public record LoginRequisicaoDto(
    string Email,
    string Senha
);

public record EsqueciSenhaRequisicaoDto(
    string Email
);

public record RedefinirSenhaRequisicaoDto(
    string Email,
    string Codigo,
    string NovaSenha
);

public record SolicitarRedefinicaoSenhaRespostaDto(
    string Mensagem,
    string? Codigo
);

public record UsuarioLogadoDto(
    Guid Id,
    string Nome,
    string Email,
    PerfilUsuario Perfil,
    bool Ativo,
    Guid? AtletaId,
    AtletaResumoDto? Atleta
);

public record UsuarioDto(
    Guid Id,
    string Nome,
    string Email,
    PerfilUsuario Perfil,
    bool Ativo,
    Guid? AtletaId,
    AtletaResumoDto? Atleta,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);

public record AtualizarMeuUsuarioDto(
    string Nome
);

public record VincularAtletaUsuarioDto(
    Guid AtletaId
);

public record AtualizarUsuarioDto(
    string Nome,
    string Email,
    PerfilUsuario Perfil,
    bool Ativo,
    Guid? AtletaId
);

public record RespostaAutenticacaoDto(
    string Token,
    UsuarioLogadoDto Usuario
);
