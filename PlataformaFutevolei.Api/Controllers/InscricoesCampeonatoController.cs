using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/campeonatos/{campeonatoId:guid}/inscricoes")]
public class InscricoesCampeonatoController(IInscricaoCampeonatoServico inscricaoServico) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<InscricaoCampeonatoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(Guid campeonatoId, [FromQuery] Guid? categoriaId, CancellationToken cancellationToken)
    {
        var inscricoes = await inscricaoServico.ListarPorCampeonatoAsync(campeonatoId, categoriaId, cancellationToken);
        return Ok(inscricoes);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(InscricaoCampeonatoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid campeonatoId, Guid id, CancellationToken cancellationToken)
    {
        var inscricao = await inscricaoServico.ObterPorIdAsync(campeonatoId, id, cancellationToken);
        return Ok(inscricao);
    }

    [HttpPost]
    [ProducesResponseType(typeof(InscricaoCampeonatoDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar(
        Guid campeonatoId,
        [FromBody] CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken)
    {
        var inscricao = await inscricaoServico.CriarAsync(campeonatoId, dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { campeonatoId, id = inscricao.Id }, inscricao);
    }
}
