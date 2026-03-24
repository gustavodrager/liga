using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/partidas")]
public class PartidasController(IPartidaServico partidaServico) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PartidaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var partida = await partidaServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(partida);
    }

    [HttpPost]
    [Authorize(Roles = nameof(PerfilUsuario.Administrador))]
    [ProducesResponseType(typeof(PartidaDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarPartidaDto dto, CancellationToken cancellationToken)
    {
        var partida = await partidaServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = partida.Id }, partida);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = nameof(PerfilUsuario.Administrador))]
    [ProducesResponseType(typeof(PartidaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarPartidaDto dto, CancellationToken cancellationToken)
    {
        var partida = await partidaServico.AtualizarAsync(id, dto, cancellationToken);
        return Ok(partida);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = nameof(PerfilUsuario.Administrador))]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await partidaServico.RemoverAsync(id, cancellationToken);
        return NoContent();
    }
}
