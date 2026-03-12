using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Dominio.Entidades;

public class Usuario : EntidadeBase
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public string? CodigoRedefinicaoSenhaHash { get; set; }
    public DateTime? CodigoRedefinicaoSenhaExpiraEmUtc { get; set; }
    public PerfilUsuario Perfil { get; set; } = PerfilUsuario.Usuario;
    public bool Ativo { get; set; } = true;
}
