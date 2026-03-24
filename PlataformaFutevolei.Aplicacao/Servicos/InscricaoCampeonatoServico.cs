using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Aplicacao.Utilitarios;
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
        var (atleta1, atleta2) = await ResolverAtletasAsync(dto, cancellationToken);
        await ObterOuCriarDuplaAsync(atleta1, atleta2, cancellationToken);

        var (atletaNormalizado1Id, atletaNormalizado2Id) = NormalizarAtletas(atleta1.Id, atleta2.Id);

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

    private async Task<(Atleta atleta1, Atleta atleta2)> ResolverAtletasAsync(
        CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken)
    {
        var atleta1 = dto.Atleta1Id.HasValue
            ? await ObterAtletaExistenteAsync(dto.Atleta1Id.Value, cancellationToken)
            : await ObterOuCriarAtletaAsync(
                dto.NomeAtleta1,
                dto.ApelidoAtleta1,
                dto.Atleta1CadastroPendente,
                cancellationToken);

        var atleta2 = dto.Atleta2Id.HasValue
            ? await ObterAtletaExistenteAsync(dto.Atleta2Id.Value, cancellationToken)
            : await ObterOuCriarAtletaAsync(
                dto.NomeAtleta2,
                dto.ApelidoAtleta2,
                dto.Atleta2CadastroPendente,
                cancellationToken);

        if (atleta1.Id == atleta2.Id)
        {
            throw new RegraNegocioException("Um atleta não pode formar dupla com ele mesmo.");
        }

        return (atleta1, atleta2);
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

    private async Task<Atleta> ObterAtletaExistenteAsync(Guid atletaId, CancellationToken cancellationToken)
    {
        if (atletaId == Guid.Empty)
        {
            throw new RegraNegocioException("A inscrição deve informar dois atletas válidos.");
        }

        var atleta = await atletaRepositorio.ObterPorIdAsync(atletaId, cancellationToken);
        if (atleta is null)
        {
            throw new RegraNegocioException("Os atletas informados para a inscrição não foram encontrados.");
        }

        return atleta;
    }

    private async Task<Atleta> ObterOuCriarAtletaAsync(
        string? nomeInformado,
        string? apelidoInformado,
        bool cadastroPendente,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(nomeInformado))
        {
            throw new RegraNegocioException("Informe o nome completo dos dois jogadores quando a dupla não estiver cadastrada.");
        }

        var nomeBase = NormalizadorNomeAtleta.NormalizarTexto(nomeInformado);
        var complemento = NormalizadorNomeAtleta.NormalizarTexto(apelidoInformado);

        if (string.IsNullOrWhiteSpace(nomeBase))
        {
            throw new RegraNegocioException("Informe um nome válido para o atleta.");
        }

        if (string.IsNullOrWhiteSpace(complemento))
        {
            var atletaExistente = await atletaRepositorio.ObterPorNomeAsync(nomeBase, cancellationToken);
            if (atletaExistente is not null)
            {
                return atletaExistente;
            }
        }

        var (nomeFinal, apelidoFinal) = NormalizadorNomeAtleta.NormalizarNomeEApelido(nomeBase, complemento);
        var atletaComNomeFinal = await atletaRepositorio.ObterPorNomeAsync(nomeFinal, cancellationToken);
        if (atletaComNomeFinal is not null)
        {
            return atletaComNomeFinal;
        }

        var atleta = new Atleta
        {
            Nome = nomeFinal,
            Apelido = apelidoFinal,
            CadastroPendente = cadastroPendente,
            Lado = LadoAtleta.Ambos
        };

        await atletaRepositorio.AdicionarAsync(atleta, cancellationToken);
        return atleta;
    }

    private async Task ObterOuCriarDuplaAsync(Atleta atleta1, Atleta atleta2, CancellationToken cancellationToken)
    {
        var dupla = await duplaRepositorio.ObterPorAtletasAsync(atleta1.Id, atleta2.Id, cancellationToken);
        if (dupla is not null)
        {
            return;
        }

        var (atletaNormalizado1Id, atletaNormalizado2Id) = NormalizarAtletas(atleta1.Id, atleta2.Id);
        var atletaNormalizado1 = atleta1.Id == atletaNormalizado1Id ? atleta1 : atleta2;
        var atletaNormalizado2 = atleta2.Id == atletaNormalizado2Id ? atleta2 : atleta1;

        await duplaRepositorio.AdicionarAsync(new Dupla
        {
            Nome = $"{atletaNormalizado1.Nome} / {atletaNormalizado2.Nome}",
            Atleta1Id = atletaNormalizado1Id,
            Atleta2Id = atletaNormalizado2Id
        }, cancellationToken);
    }

    private static (Guid atleta1Id, Guid atleta2Id) NormalizarAtletas(Guid atleta1Id, Guid atleta2Id)
    {
        return atleta1Id.CompareTo(atleta2Id) <= 0
            ? (atleta1Id, atleta2Id)
            : (atleta2Id, atleta1Id);
    }
}
