using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Route("api/convites-cadastro")]
[Authorize(Roles = nameof(PerfilUsuario.Administrador))]
public class ConvitesCadastroController(IConviteCadastroServico conviteCadastroServico) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ConviteCadastroDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var convites = await conviteCadastroServico.ListarAsync(cancellationToken);
        return Ok(convites);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ConviteCadastroDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var convite = await conviteCadastroServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(convite);
    }

    [AllowAnonymous]
    [HttpGet("publico/{token}")]
    [ProducesResponseType(typeof(ConviteCadastroPublicoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPublicoPorToken(string token, CancellationToken cancellationToken)
    {
        var convite = await conviteCadastroServico.ObterPublicoPorTokenAsync(token, cancellationToken);
        return Ok(convite);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ConviteCadastroDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarConviteCadastroDto dto, CancellationToken cancellationToken)
    {
        var convite = await conviteCadastroServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = convite.Id }, convite);
    }

    [HttpPost("{id:guid}/enviar-email")]
    [ProducesResponseType(typeof(ConviteCadastroDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> EnviarEmail(Guid id, CancellationToken cancellationToken)
    {
        var convite = await conviteCadastroServico.EnviarEmailAsync(id, cancellationToken);
        return Ok(convite);
    }

    [HttpPost("{id:guid}/enviar-whatsapp")]
    [ProducesResponseType(typeof(ConviteCadastroDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> EnviarWhatsapp(Guid id, CancellationToken cancellationToken)
    {
        var convite = await conviteCadastroServico.EnviarWhatsappAsync(id, cancellationToken);
        return Ok(convite);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Desativar(Guid id, CancellationToken cancellationToken)
    {
        await conviteCadastroServico.DesativarAsync(id, cancellationToken);
        return NoContent();
    }
}
