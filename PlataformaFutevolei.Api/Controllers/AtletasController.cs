using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/atletas")]
public class AtletasController(IAtletaServico atletaServico) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AtletaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var atletas = await atletaServico.ListarAsync(cancellationToken);
        return Ok(atletas);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AtletaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var atleta = await atletaServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(atleta);
    }

    [HttpPost]
    [ProducesResponseType(typeof(AtletaDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarAtletaDto dto, CancellationToken cancellationToken)
    {
        var atleta = await atletaServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = atleta.Id }, atleta);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AtletaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarAtletaDto dto, CancellationToken cancellationToken)
    {
        var atleta = await atletaServico.AtualizarAsync(id, dto, cancellationToken);
        return Ok(atleta);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await atletaServico.RemoverAsync(id, cancellationToken);
        return NoContent();
    }
}
