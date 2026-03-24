using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/formatos-campeonato")]
public class FormatosCampeonatoController(IFormatoCampeonatoServico formatoServico) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<FormatoCampeonatoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var formatos = await formatoServico.ListarAsync(cancellationToken);
        return Ok(formatos);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FormatoCampeonatoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var formato = await formatoServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(formato);
    }

    [HttpPost]
    [ProducesResponseType(typeof(FormatoCampeonatoDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarFormatoCampeonatoDto dto, CancellationToken cancellationToken)
    {
        var formato = await formatoServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = formato.Id }, formato);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(FormatoCampeonatoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarFormatoCampeonatoDto dto, CancellationToken cancellationToken)
    {
        var formato = await formatoServico.AtualizarAsync(id, dto, cancellationToken);
        return Ok(formato);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await formatoServico.RemoverAsync(id, cancellationToken);
        return NoContent();
    }
}
