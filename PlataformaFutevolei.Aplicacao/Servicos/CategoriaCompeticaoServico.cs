using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class CategoriaCompeticaoServico(
    ICategoriaCompeticaoRepositorio categoriaRepositorio,
    ICompeticaoRepositorio competicaoRepositorio,
    IFormatoCampeonatoRepositorio formatoRepositorio,
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
        Validar(dto.Nome, dto.PesoRanking);
        var competicao = await competicaoRepositorio.ObterPorIdAsync(dto.CompeticaoId, cancellationToken);
        if (competicao is null)
        {
            throw new RegraNegocioException("Toda categoria deve pertencer a uma competição existente.");
        }

        var formatoCampeonatoId = await ValidarFormatoCampeonatoAsync(
            competicao,
            dto.FormatoCampeonatoId,
            cancellationToken);

        var categoria = new CategoriaCompeticao
        {
            CompeticaoId = dto.CompeticaoId,
            FormatoCampeonatoId = formatoCampeonatoId,
            Nome = dto.Nome.Trim(),
            Genero = dto.Genero,
            Nivel = dto.Nivel,
            PesoRanking = dto.PesoRanking ?? 1m
        };

        await categoriaRepositorio.AdicionarAsync(categoria, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var categoriaCriada = await categoriaRepositorio.ObterPorIdAsync(categoria.Id, cancellationToken);
        return categoriaCriada!.ParaDto();
    }

    public async Task<CategoriaCompeticaoDto> AtualizarAsync(Guid id, AtualizarCategoriaCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        Validar(dto.Nome, dto.PesoRanking);
        var categoria = await categoriaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        var formatoCampeonatoId = await ValidarFormatoCampeonatoAsync(
            categoria.Competicao,
            dto.FormatoCampeonatoId,
            cancellationToken);

        categoria.FormatoCampeonatoId = formatoCampeonatoId;
        categoria.Nome = dto.Nome.Trim();
        categoria.Genero = dto.Genero;
        categoria.Nivel = dto.Nivel;
        categoria.PesoRanking = dto.PesoRanking ?? 1m;
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

    private static void Validar(string nome, decimal? pesoRanking)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome da categoria é obrigatório.");
        }

        if (pesoRanking.HasValue && pesoRanking.Value <= 0)
        {
            throw new RegraNegocioException("Peso de ranking da categoria deve ser maior que zero.");
        }
    }

    private async Task<Guid?> ValidarFormatoCampeonatoAsync(
        Competicao competicao,
        Guid? formatoCampeonatoId,
        CancellationToken cancellationToken)
    {
        if (!formatoCampeonatoId.HasValue)
        {
            return null;
        }

        if (competicao.Tipo != TipoCompeticao.Campeonato)
        {
            throw new RegraNegocioException("Formato de campeonato só pode ser vinculado a categorias de campeonatos.");
        }

        var formato = await formatoRepositorio.ObterPorIdAsync(formatoCampeonatoId.Value, cancellationToken);
        if (formato is null)
        {
            throw new RegraNegocioException("O formato de campeonato informado não foi encontrado.");
        }

        return formato.Id;
    }
}
