using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Configuracoes;

namespace PlataformaFutevolei.Infraestrutura.Seguranca;

public class TokenJwtServico(IOptions<ConfiguracaoJwt> configuracaoJwt) : ITokenJwtServico
{
    public string GerarToken(Usuario usuario)
    {
        var configuracao = configuracaoJwt.Value;
        if (string.IsNullOrWhiteSpace(configuracao.Chave))
        {
            throw new InvalidOperationException("A chave JWT não foi configurada.");
        }

        var chave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuracao.Chave));
        var credenciais = new SigningCredentials(chave, SecurityAlgorithms.HmacSha256);
        var agora = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, usuario.Nome),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Role, usuario.Perfil.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: configuracao.Emissor,
            audience: configuracao.Audiencia,
            claims: claims,
            notBefore: agora,
            expires: agora.AddMinutes(configuracao.ExpiracaoMinutos),
            signingCredentials: credenciais
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
