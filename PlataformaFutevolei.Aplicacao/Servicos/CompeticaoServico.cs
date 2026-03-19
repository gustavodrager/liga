using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class CompeticaoServico(
    ICompeticaoRepositorio competicaoRepositorio,
    ILigaRepositorio ligaRepositorio,
    IUnidadeTrabalho unidadeTrabalho
) : ICompeticaoServico
{
    public async Task<IReadOnlyList<CompeticaoDto>> ListarAsync(CancellationToken cancellationToken = default)
    {
        var competicoes = await competicaoRepositorio.ListarAsync(cancellationToken);
        return competicoes.Select(x => x.ParaDto()).ToList();
    }

    public async Task<CompeticaoDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var competicao = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (competicao is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        return competicao.ParaDto();
    }

    public async Task<CompeticaoDto> CriarAsync(CriarCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        Validar(dto.Nome, dto.DataInicio, dto.DataFim);
        await ValidarLigaAsync(dto.LigaId, cancellationToken);

        var competicao = new Competicao
        {
            Nome = dto.Nome.Trim(),
            Tipo = dto.Tipo,
            Descricao = dto.Descricao?.Trim(),
            DataInicio = dto.DataInicio,
            DataFim = dto.DataFim,
            LigaId = dto.LigaId,
            ContaRankingLiga = dto.ContaRankingLiga
        };

        await competicaoRepositorio.AdicionarAsync(competicao, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var competicaoCriada = await competicaoRepositorio.ObterPorIdAsync(competicao.Id, cancellationToken);
        return competicaoCriada!.ParaDto();
    }

    public async Task<CompeticaoDto> AtualizarAsync(Guid id, AtualizarCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        Validar(dto.Nome, dto.DataInicio, dto.DataFim);
        await ValidarLigaAsync(dto.LigaId, cancellationToken);

        var competicao = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (competicao is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        competicao.Nome = dto.Nome.Trim();
        competicao.Tipo = dto.Tipo;
        competicao.Descricao = dto.Descricao?.Trim();
        competicao.DataInicio = dto.DataInicio;
        competicao.DataFim = dto.DataFim;
        competicao.LigaId = dto.LigaId;
        competicao.ContaRankingLiga = dto.ContaRankingLiga;
        competicao.AtualizarDataModificacao();

        competicaoRepositorio.Atualizar(competicao);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var competicaoAtualizada = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        return competicaoAtualizada!.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var competicao = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (competicao is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        competicaoRepositorio.Remover(competicao);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task ValidarLigaAsync(Guid? ligaId, CancellationToken cancellationToken)
    {
        if (!ligaId.HasValue)
        {
            return;
        }

        var liga = await ligaRepositorio.ObterPorIdAsync(ligaId.Value, cancellationToken);
        if (liga is null)
        {
            throw new RegraNegocioException("A liga informada para a competição não foi encontrada.");
        }
    }

    private static void Validar(string nome, DateTime dataInicio, DateTime? dataFim)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome da competição é obrigatório.");
        }

        if (dataInicio == default)
        {
            throw new RegraNegocioException("Data de início da competição é obrigatória.");
        }

        if (dataFim.HasValue && dataFim.Value < dataInicio)
        {
            throw new RegraNegocioException("A data fim não pode ser menor que a data de início.");
        }
    }
}
