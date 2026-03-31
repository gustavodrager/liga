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
    [HttpPost("registrar-por-convite")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RespostaAutenticacaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RegistrarPorConvite([FromBody] RegistrarUsuarioRequisicaoDto dto, CancellationToken cancellationToken)
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

    [HttpPost("esqueci-senha/solicitar")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(SolicitarRedefinicaoSenhaRespostaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SolicitarRedefinicaoSenha(
        [FromBody] EsqueciSenhaRequisicaoDto dto,
        CancellationToken cancellationToken)
    {
        var resposta = await autenticacaoServico.SolicitarRedefinicaoSenhaAsync(dto, cancellationToken);
        return Ok(resposta);
    }

    [HttpPost("esqueci-senha/redefinir")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RedefinirSenha(
        [FromBody] RedefinirSenhaRequisicaoDto dto,
        CancellationToken cancellationToken)
    {
        await autenticacaoServico.RedefinirSenhaAsync(dto, cancellationToken);
        return Ok(new { mensagem = "Senha redefinida com sucesso." });
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
