using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.DTOs;

public record CriarConviteCadastroDto(
    string Email,
    string? Telefone,
    PerfilUsuario? PerfilDestino,
    DateTime? ExpiraEmUtc,
    string? CanalEnvio
);

public record ConviteCadastroDto(
    Guid Id,
    string Email,
    string? Telefone,
    string Token,
    PerfilUsuario PerfilDestino,
    DateTime ExpiraEmUtc,
    DateTime? UsadoEmUtc,
    bool Ativo,
    Guid CriadoPorUsuarioId,
    string? CriadoPorUsuarioNome,
    string? CanalEnvio,
    string Situacao,
    bool PodeSerUsado,
    string SituacaoEnvioEmail,
    DateTime? UltimaTentativaEnvioEmailEmUtc,
    DateTime? EmailEnviadoEmUtc,
    string? ErroEnvioEmail,
    DateTime DataCriacao,
    DateTime DataAtualizacao
);

public record ConviteCadastroPublicoDto(
    Guid Id,
    string Email,
    PerfilUsuario PerfilDestino,
    DateTime ExpiraEmUtc,
    string Situacao,
    bool PodeSerUsado
);

public record ResultadoEnvioEmailConviteDto(
    bool TentativaRealizada,
    bool Enviado,
    string? Erro,
    string? IdentificadorMensagem
);
