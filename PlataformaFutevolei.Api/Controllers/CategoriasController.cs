using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/categorias")]
public class CategoriasController(ICategoriaCompeticaoServico categoriaServico, IPartidaServico partidaServico) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CategoriaCompeticaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var categoria = await categoriaServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(categoria);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CategoriaCompeticaoDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarCategoriaCompeticaoDto dto, CancellationToken cancellationToken)
    {
        var categoria = await categoriaServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = categoria.Id }, categoria);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CategoriaCompeticaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarCategoriaCompeticaoDto dto, CancellationToken cancellationToken)
    {
        var categoria = await categoriaServico.AtualizarAsync(id, dto, cancellationToken);
        return Ok(categoria);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await categoriaServico.RemoverAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/partidas")]
    [ProducesResponseType(typeof(IReadOnlyList<PartidaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarPartidas(Guid id, CancellationToken cancellationToken)
    {
        var partidas = await partidaServico.ListarPorCategoriaAsync(id, cancellationToken);
        return Ok(partidas);
    }

    [HttpPost("{id:guid}/partidas/gerar-tabela")]
    [Authorize(Roles = nameof(PerfilUsuario.Administrador))]
    [ProducesResponseType(typeof(GeracaoTabelaCategoriaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GerarTabelaPartidas(
        Guid id,
        [FromBody] GerarTabelaCategoriaDto dto,
        CancellationToken cancellationToken)
    {
        var resultado = await partidaServico.GerarTabelaCategoriaAsync(id, dto, cancellationToken);
        return Ok(resultado);
    }
}
