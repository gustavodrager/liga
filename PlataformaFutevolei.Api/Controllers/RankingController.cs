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
    [AllowAnonymous]
    [ProducesResponseType(typeof(RankingFiltroInicialDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterFiltroInicial(CancellationToken cancellationToken)
    {
        var filtro = await rankingServico.ObterFiltroInicialAsync(cancellationToken);
        return Ok(filtro);
    }

    [HttpGet("geral/atletas")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<RankingCategoriaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAtletasGeral(CancellationToken cancellationToken)
    {
        var ranking = await rankingServico.ListarAtletasGeralAsync(cancellationToken);
        return Ok(ranking);
    }

    [HttpGet("ligas/{ligaId:guid}/atletas")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<RankingCategoriaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAtletasPorLiga(Guid ligaId, CancellationToken cancellationToken)
    {
        var ranking = await rankingServico.ListarAtletasPorLigaAsync(ligaId, cancellationToken);
        return Ok(ranking);
    }

    [HttpGet("competicoes/{competicaoId:guid}/atletas")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<RankingCategoriaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAtletasPorCompeticao(Guid competicaoId, CancellationToken cancellationToken)
    {
        var ranking = await rankingServico.ListarAtletasPorCompeticaoAsync(competicaoId, cancellationToken);
        return Ok(ranking);
    }
}
