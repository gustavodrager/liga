using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record RegistrarUsuarioRequisicaoDto(
    string Nome,
    string Email,
    string Senha,
    PerfilUsuario Perfil = PerfilUsuario.Usuario
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
    PerfilUsuario Perfil
);

public record RespostaAutenticacaoDto(
    string Token,
    UsuarioLogadoDto Usuario
);
