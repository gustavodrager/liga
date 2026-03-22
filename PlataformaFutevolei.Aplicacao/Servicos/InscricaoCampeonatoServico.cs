using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class InscricaoCampeonatoServico(
    IInscricaoCampeonatoRepositorio inscricaoRepositorio,
    ICompeticaoRepositorio competicaoRepositorio,
    ICategoriaCompeticaoRepositorio categoriaRepositorio,
    IAtletaRepositorio atletaRepositorio,
    IDuplaRepositorio duplaRepositorio,
    IUnidadeTrabalho unidadeTrabalho
) : IInscricaoCampeonatoServico
{
    public async Task<IReadOnlyList<InscricaoCampeonatoDto>> ListarPorCampeonatoAsync(
        Guid campeonatoId,
        Guid? categoriaId,
        CancellationToken cancellationToken = default)
    {
        await ObterCampeonatoValidoAsync(campeonatoId, cancellationToken);

        if (categoriaId.HasValue)
        {
            await ObterCategoriaValidaAsync(campeonatoId, categoriaId.Value, cancellationToken);
        }

        var inscricoes = await inscricaoRepositorio.ListarPorCampeonatoAsync(campeonatoId, categoriaId, cancellationToken);
        return inscricoes.Select(x => x.ParaDto()).ToList();
    }

    public async Task<InscricaoCampeonatoDto> ObterPorIdAsync(
        Guid campeonatoId,
        Guid inscricaoId,
        CancellationToken cancellationToken = default)
    {
        await ObterCampeonatoValidoAsync(campeonatoId, cancellationToken);

        var inscricao = await inscricaoRepositorio.ObterPorIdAsync(inscricaoId, cancellationToken);
        if (inscricao is null || inscricao.CompeticaoId != campeonatoId)
        {
            throw new EntidadeNaoEncontradaException("Inscrição não encontrada para o campeonato informado.");
        }

        return inscricao.ParaDto();
    }

    public async Task<InscricaoCampeonatoDto> CriarAsync(
        Guid campeonatoId,
        CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken = default)
    {
        var campeonato = await ObterCampeonatoValidoAsync(campeonatoId, cancellationToken, exigirInscricoesAbertas: true);
        var categoria = await ObterCategoriaValidaAsync(campeonatoId, dto.CategoriaId, cancellationToken);
        var (atleta1, atleta2) = await ValidarAtletasAsync(dto.Atleta1Id, dto.Atleta2Id, cancellationToken);
        await ValidarDuplaExistenteAsync(dto.Atleta1Id, dto.Atleta2Id, cancellationToken);

        var (atletaNormalizado1Id, atletaNormalizado2Id) = NormalizarAtletas(dto.Atleta1Id, dto.Atleta2Id);

        var inscricaoDuplicada = await inscricaoRepositorio.ObterDuplicadaAsync(
            dto.CategoriaId,
            atletaNormalizado1Id,
            atletaNormalizado2Id,
            cancellationToken);
        if (inscricaoDuplicada is not null)
        {
            throw new RegraNegocioException("Esta dupla já está inscrita nesta categoria do campeonato.");
        }

        var inscricao = new InscricaoCampeonato
        {
            CompeticaoId = campeonato.Id,
            CategoriaCompeticaoId = categoria.Id,
            Atleta1Id = atletaNormalizado1Id,
            Atleta2Id = atletaNormalizado2Id,
            DataInscricaoUtc = DateTime.UtcNow,
            Status = StatusInscricaoCampeonato.Ativa,
            Observacao = dto.Observacao?.Trim(),
            Competicao = campeonato,
            CategoriaCompeticao = categoria,
            Atleta1 = atleta1.Id == atletaNormalizado1Id ? atleta1 : atleta2,
            Atleta2 = atleta2.Id == atletaNormalizado2Id ? atleta2 : atleta1
        };

        await inscricaoRepositorio.AdicionarAsync(inscricao, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var inscricaoCriada = await inscricaoRepositorio.ObterPorIdAsync(inscricao.Id, cancellationToken);
        return inscricaoCriada!.ParaDto();
    }

    private async Task<Competicao> ObterCampeonatoValidoAsync(
        Guid campeonatoId,
        CancellationToken cancellationToken,
        bool exigirInscricoesAbertas = false)
    {
        var campeonato = await competicaoRepositorio.ObterPorIdAsync(campeonatoId, cancellationToken);
        if (campeonato is null)
        {
            throw new EntidadeNaoEncontradaException("Campeonato não encontrado.");
        }

        if (campeonato.Tipo != TipoCompeticao.Campeonato)
        {
            throw new RegraNegocioException("A competição informada não é um campeonato.");
        }

        if (exigirInscricoesAbertas && !campeonato.InscricoesAbertas)
        {
            throw new RegraNegocioException("O campeonato não está apto para receber inscrições.");
        }

        return campeonato;
    }

    private async Task<CategoriaCompeticao> ObterCategoriaValidaAsync(
        Guid campeonatoId,
        Guid categoriaId,
        CancellationToken cancellationToken)
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaId, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        if (categoria.CompeticaoId != campeonatoId)
        {
            throw new RegraNegocioException("A categoria informada não pertence ao campeonato.");
        }

        return categoria;
    }

    private async Task<(Atleta atleta1, Atleta atleta2)> ValidarAtletasAsync(
        Guid atleta1Id,
        Guid atleta2Id,
        CancellationToken cancellationToken)
    {
        if (atleta1Id == Guid.Empty || atleta2Id == Guid.Empty)
        {
            throw new RegraNegocioException("A inscrição deve informar dois atletas válidos.");
        }

        if (atleta1Id == atleta2Id)
        {
            throw new RegraNegocioException("Um atleta não pode formar dupla com ele mesmo.");
        }

        var atleta1 = await atletaRepositorio.ObterPorIdAsync(atleta1Id, cancellationToken);
        var atleta2 = await atletaRepositorio.ObterPorIdAsync(atleta2Id, cancellationToken);
        if (atleta1 is null || atleta2 is null)
        {
            throw new RegraNegocioException("Os atletas informados para a inscrição não foram encontrados.");
        }

        return (atleta1, atleta2);
    }

    private async Task ValidarDuplaExistenteAsync(Guid atleta1Id, Guid atleta2Id, CancellationToken cancellationToken)
    {
        var dupla = await duplaRepositorio.ObterPorAtletasAsync(atleta1Id, atleta2Id, cancellationToken);
        if (dupla is null)
        {
            throw new RegraNegocioException("A dupla informada precisa estar cadastrada antes da inscrição.");
        }
    }

    private static (Guid atleta1Id, Guid atleta2Id) NormalizarAtletas(Guid atleta1Id, Guid atleta2Id)
    {
        return atleta1Id.CompareTo(atleta2Id) <= 0
            ? (atleta1Id, atleta2Id)
            : (atleta2Id, atleta1Id);
    }
}
