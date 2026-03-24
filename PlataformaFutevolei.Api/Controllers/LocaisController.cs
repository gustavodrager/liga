using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/locais")]
public class LocaisController(ILocalServico localServico) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<LocalDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var locais = await localServico.ListarAsync(cancellationToken);
        return Ok(locais);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(LocalDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var local = await localServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(local);
    }

    [HttpPost]
    [ProducesResponseType(typeof(LocalDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarLocalDto dto, CancellationToken cancellationToken)
    {
        var local = await localServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = local.Id }, local);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(LocalDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarLocalDto dto, CancellationToken cancellationToken)
    {
        var local = await localServico.AtualizarAsync(id, dto, cancellationToken);
        return Ok(local);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await localServico.RemoverAsync(id, cancellationToken);
        return NoContent();
    }
}
