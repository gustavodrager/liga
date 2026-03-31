using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

public interface IEnvioEmailConviteCadastroServico
{
    Task<ResultadoEnvioEmailConviteDto> EnviarAsync(
        ConviteCadastro conviteCadastro,
        CancellationToken cancellationToken = default);
}
