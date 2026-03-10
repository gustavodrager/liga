using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Route("api/autenticacao")]
public class AutenticacaoController(IAutenticacaoServico autenticacaoServico) : ControllerBase
{
    [HttpPost("registrar")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RespostaAutenticacaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioRequisicaoDto dto, CancellationToken cancellationToken)
    {
        var resposta = await autenticacaoServico.RegistrarAsync(dto, cancellationToken);
        return Ok(resposta);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RespostaAutenticacaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login([FromBody] LoginRequisicaoDto dto, CancellationToken cancellationToken)
    {
        var resposta = await autenticacaoServico.LoginAsync(dto, cancellationToken);
        return Ok(resposta);
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UsuarioLogadoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var usuario = await autenticacaoServico.ObterUsuarioAtualAsync(cancellationToken);
        return Ok(usuario);
    }
}
