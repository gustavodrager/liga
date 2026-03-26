using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/competicoes")]
public class CompeticoesController(ICompeticaoServico competicaoServico, ICategoriaCompeticaoServico categoriaServico) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CompeticaoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var competicoes = await competicaoServico.ListarAsync(cancellationToken);
        return Ok(competicoes);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CompeticaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var competicao = await competicaoServico.ObterPorIdAsync(id, cancellationToken);
        return Ok(competicao);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CompeticaoDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Criar([FromBody] CriarCompeticaoDto dto, CancellationToken cancellationToken)
    {
        var competicao = await competicaoServico.CriarAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = competicao.Id }, competicao);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CompeticaoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarCompeticaoDto dto, CancellationToken cancellationToken)
    {
        var competicao = await competicaoServico.AtualizarAsync(id, dto, cancellationToken);
        return Ok(competicao);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await competicaoServico.RemoverAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/categorias")]
    [ProducesResponseType(typeof(IReadOnlyList<CategoriaCompeticaoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarCategorias(Guid id, CancellationToken cancellationToken)
    {
        var categorias = await categoriaServico.ListarPorCompeticaoAsync(id, cancellationToken);
        return Ok(categorias);
    }
}
