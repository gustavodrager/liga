using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ranking")]
public class RankingController(IRankingServico rankingServico) : ControllerBase
{
    [HttpGet("filtro-inicial")]
    [ProducesResponseType(typeof(RankingFiltroInicialDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterFiltroInicial(CancellationToken cancellationToken)
    {
        var filtro = await rankingServico.ObterFiltroInicialAsync(cancellationToken);
        return Ok(filtro);
    }

    [HttpGet("ligas/{ligaId:guid}/atletas")]
    [ProducesResponseType(typeof(IReadOnlyList<RankingCategoriaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAtletasPorLiga(Guid ligaId, CancellationToken cancellationToken)
    {
        var ranking = await rankingServico.ListarAtletasPorLigaAsync(ligaId, cancellationToken);
        return Ok(ranking);
    }

    [HttpGet("competicoes/{competicaoId:guid}/atletas")]
    [ProducesResponseType(typeof(IReadOnlyList<RankingCategoriaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAtletasPorCompeticao(Guid competicaoId, CancellationToken cancellationToken)
    {
        var ranking = await rankingServico.ListarAtletasPorCompeticaoAsync(competicaoId, cancellationToken);
        return Ok(ranking);
    }
}
