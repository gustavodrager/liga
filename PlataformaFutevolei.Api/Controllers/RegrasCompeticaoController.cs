using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/regras-competicao")]
public class RegrasCompeticaoController(IRegraCompeticaoServico regraServico) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RegraCompeticaoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var regras = await regraServico.ListarAsync(cancellationToken);
        return Ok(regras);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(RegraCompeticaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var regra = await regraServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(regra);
    }

    [HttpPost]
    [ProducesResponseType(typeof(RegraCompeticaoDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarRegraCompeticaoDto dto, CancellationToken cancellationToken)
    {
        var regra = await regraServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = regra.Id }, regra);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(RegraCompeticaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarRegraCompeticaoDto dto, CancellationToken cancellationToken)
    {
        var regra = await regraServico.AtualizarAsync(id, dto, cancellationToken);
        return Ok(regra);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await regraServico.RemoverAsync(id, cancellationToken);
        return NoContent();
    }
}
