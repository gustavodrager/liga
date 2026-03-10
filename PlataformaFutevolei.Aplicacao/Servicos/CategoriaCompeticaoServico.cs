using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class CategoriaCompeticaoServico(
    ICategoriaCompeticaoRepositorio categoriaRepositorio,
    ICompeticaoRepositorio competicaoRepositorio,
    IUnidadeTrabalho unidadeTrabalho
) : ICategoriaCompeticaoServico
{
    public async Task<IReadOnlyList<CategoriaCompeticaoDto>> ListarPorCompeticaoAsync(Guid competicaoId, CancellationToken cancellationToken = default)
    {
        var categorias = await categoriaRepositorio.ListarPorCompeticaoAsync(competicaoId, cancellationToken);
        return categorias.Select(x => x.ParaDto()).ToList();
    }

    public async Task<CategoriaCompeticaoDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        return categoria.ParaDto();
    }

    public async Task<CategoriaCompeticaoDto> CriarAsync(CriarCategoriaCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        Validar(dto.Nome);
        var competicao = await competicaoRepositorio.ObterPorIdAsync(dto.CompeticaoId, cancellationToken);
        if (competicao is null)
        {
            throw new RegraNegocioException("Toda categoria deve pertencer a uma competição existente.");
        }

        var categoria = new CategoriaCompeticao
        {
            CompeticaoId = dto.CompeticaoId,
            Nome = dto.Nome.Trim(),
            Genero = dto.Genero,
            Nivel = dto.Nivel
        };

        await categoriaRepositorio.AdicionarAsync(categoria, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var categoriaCriada = await categoriaRepositorio.ObterPorIdAsync(categoria.Id, cancellationToken);
        return categoriaCriada!.ParaDto();
    }

    public async Task<CategoriaCompeticaoDto> AtualizarAsync(Guid id, AtualizarCategoriaCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        Validar(dto.Nome);
        var categoria = await categoriaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        categoria.Nome = dto.Nome.Trim();
        categoria.Genero = dto.Genero;
        categoria.Nivel = dto.Nivel;
        categoria.AtualizarDataModificacao();

        categoriaRepositorio.Atualizar(categoria);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var categoriaAtualizada = await categoriaRepositorio.ObterPorIdAsync(id, cancellationToken);
        return categoriaAtualizada!.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        categoriaRepositorio.Remover(categoria);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private static void Validar(string nome)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome da categoria é obrigatório.");
        }
    }
}
