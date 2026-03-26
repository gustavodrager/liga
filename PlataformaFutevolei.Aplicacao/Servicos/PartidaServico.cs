using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class PartidaServico(
    IPartidaRepositorio partidaRepositorio,
    ICategoriaCompeticaoRepositorio categoriaRepositorio,
    IDuplaRepositorio duplaRepositorio,
    IInscricaoCampeonatoRepositorio inscricaoRepositorio,
    IGrupoAtletaRepositorio grupoAtletaRepositorio,
    IUnidadeTrabalho unidadeTrabalho,
    IAutorizacaoUsuarioServico autorizacaoUsuarioServico
) : IPartidaServico
{
    private const string MarcadorMetadadosChave = "[[chave:";
    private const string MarcadorMetadadosRodada = "[[rodada:";
    private const string NomeFaseFinal = "Final";
    private const string NomeFaseTerceiroLugar = "Disputa de 3º lugar";

    public async Task<IReadOnlyList<PartidaDto>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaId, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            if (categoria.Competicao.Tipo != TipoCompeticao.Grupo)
            {
                throw new RegraNegocioException("Atletas só podem visualizar partidas de grupos.");
            }
        }
        else
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(categoria.CompeticaoId, cancellationToken);
        }

        var partidas = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        return partidas.Select(x => x.ParaDto()).ToList();
    }

    public async Task<PartidaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var partida = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (partida is null)
        {
            throw new EntidadeNaoEncontradaException("Partida não encontrada.");
        }

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            if (partida.CategoriaCompeticao.Competicao.Tipo != TipoCompeticao.Grupo)
            {
                throw new RegraNegocioException("Atletas só podem visualizar partidas de grupos.");
            }
        }
        else
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(partida.CategoriaCompeticao.CompeticaoId, cancellationToken);
        }

        return partida.ParaDto();
    }

    public async Task<GeracaoTabelaCategoriaDto> GerarTabelaCategoriaAsync(
        Guid categoriaId,
        GerarTabelaCategoriaDto dto,
        CancellationToken cancellationToken = default)
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaId, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        await GarantirEdicaoPartidasAsync(categoria.Competicao, cancellationToken);

        if (categoria.Competicao.Tipo == TipoCompeticao.Grupo)
        {
            throw new RegraNegocioException("O sorteio automático de jogos está disponível apenas para categorias de campeonato ou evento.");
        }

        var partidasExistentes = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        ValidarTabelaPodeSerSubstituida(partidasExistentes);

        if (partidasExistentes.Count > 0 && !dto.SubstituirTabelaExistente)
        {
            throw new RegraNegocioException("A categoria já possui uma tabela de jogos gerada. Use a substituição para gerar novamente.");
        }

        if (partidasExistentes.Count > 0)
        {
            await RemoverPartidasCategoriaAsync(partidasExistentes, cancellationToken);
        }

        categoria.LimparAprovacaoTabelaJogos();

        var inscricoes = await inscricaoRepositorio.ListarPorCampeonatoAsync(
            categoria.CompeticaoId,
            categoriaId,
            cancellationToken);

        var duplasInscritas = await ResolverDuplasInscritasAsync(inscricoes, cancellationToken);
        if (duplasInscritas.Count < 4)
        {
            throw new RegraNegocioException("A categoria precisa ter ao menos quatro duplas inscritas para sortear os jogos.");
        }

        var partidasGeradas = GerarPartidasCategoria(categoria, duplasInscritas);
        foreach (var partida in partidasGeradas)
        {
            await partidaRepositorio.AdicionarAsync(partida, cancellationToken);
        }

        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var partidasAtualizadas = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        var formato = categoria.FormatoCampeonato;
        return new GeracaoTabelaCategoriaDto(
            categoria.Id,
            categoria.Nome,
            partidasGeradas.Count,
            partidasExistentes.Count > 0,
            MontarResumoGeracao(categoria, formato, duplasInscritas.Count, partidasGeradas),
            partidasAtualizadas.Select(x => x.ParaDto()).ToList());
    }

    public async Task<RemocaoTabelaCategoriaDto> RemoverTabelaCategoriaAsync(
        Guid categoriaId,
        CancellationToken cancellationToken = default)
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaId, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        await GarantirEdicaoPartidasAsync(categoria.Competicao, cancellationToken);

        if (categoria.Competicao.Tipo == TipoCompeticao.Grupo)
        {
            throw new RegraNegocioException("A exclusão em lote dos jogos está disponível apenas para categorias de campeonato ou evento.");
        }

        var partidasExistentes = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        if (partidasExistentes.Count == 0)
        {
            throw new RegraNegocioException("A categoria não possui jogos cadastrados para excluir.");
        }

        ValidarTabelaPodeSerSubstituida(partidasExistentes);
        await RemoverPartidasCategoriaAsync(partidasExistentes, cancellationToken);
        categoria.LimparAprovacaoTabelaJogos();
        categoriaRepositorio.Atualizar(categoria);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        return new RemocaoTabelaCategoriaDto(
            categoria.Id,
            categoria.Nome,
            partidasExistentes.Count,
            $"Tabela removida com {partidasExistentes.Count} jogo(s) excluído(s) da categoria {categoria.Nome}.");
    }

    public async Task<PartidaDto> CriarAsync(CriarPartidaDto dto, CancellationToken cancellationToken = default)
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(dto.CategoriaCompeticaoId, cancellationToken)
            ?? throw new EntidadeNaoEncontradaException("Categoria não encontrada.");

        await GarantirEdicaoPartidasAsync(categoria.Competicao, cancellationToken);

        if (categoria.Competicao.Tipo != TipoCompeticao.Grupo)
        {
            throw new RegraNegocioException("Use o sorteio da categoria para gerar os jogos de campeonato ou evento.");
        }

        var (_, duplaA, duplaB) = await ValidarRelacionamentosAsync(
            dto.CategoriaCompeticaoId,
            dto.DuplaAId,
            dto.DuplaBId,
            dto.DuplaAAtleta1Id,
            dto.DuplaAAtleta2Id,
            dto.DuplaBAtleta1Id,
            dto.DuplaBAtleta2Id,
            cancellationToken
        );

        var partida = new Partida
        {
            CategoriaCompeticaoId = dto.CategoriaCompeticaoId,
            DuplaAId = duplaA.Id,
            DuplaBId = duplaB.Id,
            FaseCampeonato = NormalizarFaseCampeonato(dto.FaseCampeonato),
            Status = dto.Status,
            DataPartida = dto.DataPartida.HasValue ? NormalizarParaUtc(dto.DataPartida.Value) : null,
            Observacoes = dto.Observacoes?.Trim(),
            CategoriaCompeticao = categoria,
            DuplaA = duplaA,
            DuplaB = duplaB
        };

        AplicarStatusEResultado(partida, dto.Status, dto.PlacarDuplaA, dto.PlacarDuplaB, dataAtualPadraoUtc: DateTime.UtcNow);
        ValidarPartida(partida, categoria.Competicao);

        await partidaRepositorio.AdicionarAsync(partida, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var partidaCriada = await partidaRepositorio.ObterPorIdAsync(partida.Id, cancellationToken);
        return partidaCriada!.ParaDto();
    }

    public async Task<PartidaDto> AtualizarAsync(Guid id, AtualizarPartidaDto dto, CancellationToken cancellationToken = default)
    {
        var partida = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (partida is null)
        {
            throw new EntidadeNaoEncontradaException("Partida não encontrada.");
        }

        await GarantirEdicaoPartidasAsync(partida.CategoriaCompeticao.Competicao, cancellationToken);

        var (categoria, duplaA, duplaB) = await ValidarRelacionamentosAsync(
            dto.CategoriaCompeticaoId,
            dto.DuplaAId,
            dto.DuplaBId,
            dto.DuplaAAtleta1Id,
            dto.DuplaAAtleta2Id,
            dto.DuplaBAtleta1Id,
            dto.DuplaBAtleta2Id,
            cancellationToken
        );

        partida.CategoriaCompeticaoId = dto.CategoriaCompeticaoId;
        partida.DuplaAId = duplaA.Id;
        partida.DuplaBId = duplaB.Id;
        partida.FaseCampeonato = NormalizarFaseCampeonato(dto.FaseCampeonato);
        partida.Status = dto.Status;
        partida.DataPartida = dto.DataPartida.HasValue ? NormalizarParaUtc(dto.DataPartida.Value) : null;
        var metadadosChave = ExtrairMetadadosChave(partida.Observacoes);
        var metadadosRodada = ExtrairMetadadosRodada(partida.Observacoes);
        partida.Observacoes = dto.Observacoes?.Trim();
        partida.CategoriaCompeticao = categoria;
        partida.DuplaA = duplaA;
        partida.DuplaB = duplaB;

        ValidarTabelaAprovadaParaResultado(categoria, dto.Status);
        AplicarStatusEResultado(partida, dto.Status, dto.PlacarDuplaA, dto.PlacarDuplaB, partida.DataPartida ?? DateTime.UtcNow);
        ValidarPartida(partida, categoria.Competicao);
        partida.AtualizarDataModificacao();
        partida.Observacoes = MontarObservacoesPartida(dto.Observacoes?.Trim(), metadadosChave, metadadosRodada);

        partidaRepositorio.Atualizar(partida);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        await ProcessarAvancoChaveAsync(categoria, cancellationToken);
        await ProcessarAvancoRodadasAsync(categoria, cancellationToken);
        var partidaAtualizada = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        return partidaAtualizada!.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var partida = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (partida is null)
        {
            throw new EntidadeNaoEncontradaException("Partida não encontrada.");
        }

        await GarantirEdicaoPartidasAsync(partida.CategoriaCompeticao.Competicao, cancellationToken);

        partidaRepositorio.Remover(partida);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task RemoverPartidasCategoriaAsync(
        IReadOnlyList<Partida> partidasExistentes,
        CancellationToken cancellationToken)
    {
        foreach (var partidaExistente in partidasExistentes)
        {
            partidaRepositorio.Remover(partidaExistente);
        }

        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private static void ValidarTabelaPodeSerSubstituida(IReadOnlyList<Partida> partidasExistentes)
    {
        if (partidasExistentes.Any(x => x.Status == StatusPartida.Encerrada))
        {
            throw new RegraNegocioException("A categoria já possui partidas encerradas. Remova ou ajuste a tabela manualmente antes de gerar novamente.");
        }
    }

    private static void ValidarTabelaAprovadaParaResultado(CategoriaCompeticao categoria, StatusPartida status)
    {
        if (categoria.Competicao.Tipo == TipoCompeticao.Grupo || status != StatusPartida.Encerrada)
        {
            return;
        }

        if (!categoria.TabelaJogosAprovada)
        {
            throw new RegraNegocioException("A tabela de jogos precisa ser aprovada antes de preencher resultados.");
        }
    }

    private static DateTime NormalizarParaUtc(DateTime data)
    {
        return data.Kind switch
        {
            DateTimeKind.Utc => data,
            DateTimeKind.Local => data.ToUniversalTime(),
            _ => DateTime.SpecifyKind(data, DateTimeKind.Utc)
        };
    }

    private async Task<(CategoriaCompeticao categoria, Dupla duplaA, Dupla duplaB)> ValidarRelacionamentosAsync(
        Guid categoriaCompeticaoId,
        Guid? duplaAId,
        Guid? duplaBId,
        Guid? duplaAAtleta1Id,
        Guid? duplaAAtleta2Id,
        Guid? duplaBAtleta1Id,
        Guid? duplaBAtleta2Id,
        CancellationToken cancellationToken
    )
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaCompeticaoId, cancellationToken);
        if (categoria is null)
        {
            throw new RegraNegocioException("Toda partida deve pertencer a uma categoria.");
        }

        await GarantirEdicaoPartidasAsync(categoria.Competicao, cancellationToken);

        Dupla duplaA;
        Dupla duplaB;
        if (categoria.Competicao.Tipo == TipoCompeticao.Grupo)
        {
            duplaA = await ResolverDuplaGrupoAsync(categoria.CompeticaoId, duplaAAtleta1Id, duplaAAtleta2Id, cancellationToken);
            duplaB = await ResolverDuplaGrupoAsync(categoria.CompeticaoId, duplaBAtleta1Id, duplaBAtleta2Id, cancellationToken);
        }
        else
        {
            if (!duplaAId.HasValue || !duplaBId.HasValue)
            {
                throw new RegraNegocioException("As duplas da partida devem estar informadas.");
            }

            duplaA = await duplaRepositorio.ObterPorIdAsync(duplaAId.Value, cancellationToken)
                ?? throw new RegraNegocioException("As duplas da partida devem estar cadastradas.");
            duplaB = await duplaRepositorio.ObterPorIdAsync(duplaBId.Value, cancellationToken)
                ?? throw new RegraNegocioException("As duplas da partida devem estar cadastradas.");

            if (categoria.Competicao.Tipo is TipoCompeticao.Campeonato or TipoCompeticao.Evento)
            {
                await ValidarInscricaoCompeticaoAsync(categoria.Id, duplaA, cancellationToken);
                await ValidarInscricaoCompeticaoAsync(categoria.Id, duplaB, cancellationToken);
            }
        }

        if (duplaA.Id == duplaB.Id)
        {
            throw new RegraNegocioException("Uma partida não pode ter a mesma dupla em ambos os lados.");
        }

        ValidarAtletasDuplicadosNaPartida(duplaA, duplaB);

        return (categoria, duplaA, duplaB);
    }

    private async Task ValidarInscricaoCompeticaoAsync(
        Guid categoriaId,
        Dupla dupla,
        CancellationToken cancellationToken)
    {
        var inscricao = await inscricaoRepositorio.ObterDuplicadaAsync(
            categoriaId,
            dupla.Id,
            cancellationToken);

        if (inscricao is null)
        {
            throw new RegraNegocioException($"A dupla {dupla.Nome} precisa estar inscrita nesta categoria da competição.");
        }
    }

    private async Task<Dupla> ResolverDuplaGrupoAsync(
        Guid competicaoId,
        Guid? atleta1Id,
        Guid? atleta2Id,
        CancellationToken cancellationToken)
    {
        if (!atleta1Id.HasValue || !atleta2Id.HasValue || atleta1Id == Guid.Empty || atleta2Id == Guid.Empty)
        {
            throw new RegraNegocioException("Informe os quatro atletas da partida do grupo.");
        }

        if (atleta1Id == atleta2Id)
        {
            throw new RegraNegocioException("Uma dupla não pode ter o mesmo atleta duas vezes.");
        }

        var (atletaNormalizado1Id, atletaNormalizado2Id) = NormalizarAtletas(atleta1Id.Value, atleta2Id.Value);

        await ValidarAtletaNoGrupoAsync(competicaoId, atletaNormalizado1Id, cancellationToken);
        await ValidarAtletaNoGrupoAsync(competicaoId, atletaNormalizado2Id, cancellationToken);

        var duplaExistente = await duplaRepositorio.ObterPorAtletasAsync(atletaNormalizado1Id, atletaNormalizado2Id, cancellationToken);
        if (duplaExistente is not null)
        {
            return duplaExistente;
        }

        var grupoAtleta1 = await grupoAtletaRepositorio.ObterPorCompeticaoEAtletaAsync(competicaoId, atletaNormalizado1Id, cancellationToken);
        var grupoAtleta2 = await grupoAtletaRepositorio.ObterPorCompeticaoEAtletaAsync(competicaoId, atletaNormalizado2Id, cancellationToken);
        var dupla = new Dupla
        {
            Nome = $"{grupoAtleta1!.Atleta.Nome} / {grupoAtleta2!.Atleta.Nome}",
            Atleta1Id = atletaNormalizado1Id,
            Atleta2Id = atletaNormalizado2Id
        };

        await duplaRepositorio.AdicionarAsync(dupla, cancellationToken);
        return dupla;
    }

    private async Task ValidarAtletaNoGrupoAsync(Guid competicaoId, Guid atletaId, CancellationToken cancellationToken)
    {
        var grupoAtleta = await grupoAtletaRepositorio.ObterPorCompeticaoEAtletaAsync(competicaoId, atletaId, cancellationToken);
        if (grupoAtleta is null)
        {
            throw new RegraNegocioException("Todos os atletas informados precisam estar no grupo.");
        }
    }

    private static void ValidarAtletasDuplicadosNaPartida(Dupla duplaA, Dupla duplaB)
    {
        if (duplaA.Atleta1Id == duplaB.Atleta1Id ||
            duplaA.Atleta1Id == duplaB.Atleta2Id ||
            duplaA.Atleta2Id == duplaB.Atleta1Id ||
            duplaA.Atleta2Id == duplaB.Atleta2Id)
        {
            throw new RegraNegocioException("Um mesmo atleta não pode jogar pelos dois lados da partida.");
        }
    }

    private static (Guid atleta1Id, Guid atleta2Id) NormalizarAtletas(Guid atleta1Id, Guid atleta2Id)
    {
        return atleta1Id.CompareTo(atleta2Id) <= 0
            ? (atleta1Id, atleta2Id)
            : (atleta2Id, atleta1Id);
    }

    private static void AplicarStatusEResultado(
        Partida partida,
        StatusPartida status,
        int? placarDuplaA,
        int? placarDuplaB,
        DateTime dataAtualPadraoUtc)
    {
        if (status == StatusPartida.Agendada)
        {
            partida.PlacarDuplaA = 0;
            partida.PlacarDuplaB = 0;
            partida.DuplaVencedoraId = null;
            return;
        }

        if (!placarDuplaA.HasValue || !placarDuplaB.HasValue)
        {
            throw new RegraNegocioException("Informe o placar das duas duplas para encerrar a partida.");
        }

        partida.PlacarDuplaA = placarDuplaA.Value;
        partida.PlacarDuplaB = placarDuplaB.Value;
        partida.DuplaVencedoraId = partida.ObterDuplaVencedoraPorPlacar();
        partida.DataPartida ??= dataAtualPadraoUtc;
    }

    private static void ValidarPartida(Partida partida, Competicao competicao)
    {
        if (competicao.Tipo == TipoCompeticao.Campeonato && string.IsNullOrWhiteSpace(partida.FaseCampeonato))
        {
            throw new RegraNegocioException("Informe a fase da partida para jogos de campeonato.");
        }

        if (competicao.Tipo != TipoCompeticao.Campeonato && !string.IsNullOrWhiteSpace(partida.FaseCampeonato))
        {
            throw new RegraNegocioException("Fase da partida só deve ser informada para jogos de campeonato.");
        }

        if (partida.Status == StatusPartida.Agendada)
        {
            if (partida.DuplaVencedoraId.HasValue)
            {
                throw new RegraNegocioException("Partidas agendadas não devem informar dupla vencedora.");
            }

            return;
        }

        if (partida.PlacarDuplaA < 0 || partida.PlacarDuplaB < 0)
        {
            throw new RegraNegocioException("Placar não pode ser negativo.");
        }

        if (!partida.DataPartida.HasValue)
        {
            throw new RegraNegocioException("Informe a data da partida encerrada.");
        }

        if (partida.TerminouEmpatada())
        {
            if (!competicao.ObterPermiteEmpate())
            {
                throw new RegraNegocioException("A partida não pode terminar empatada.");
            }

            if (partida.DuplaVencedoraId.HasValue)
            {
                throw new RegraNegocioException("Partidas empatadas não devem informar dupla vencedora.");
            }

            if (partida.ObterMaiorPlacar() < competicao.ObterPontosMinimosPartida())
            {
                throw new RegraNegocioException($"Em caso de empate, a partida deve atingir no mínimo {competicao.ObterPontosMinimosPartida()} pontos.");
            }

            return;
        }

        if (partida.ObterMaiorPlacar() < competicao.ObterPontosMinimosPartida())
        {
            throw new RegraNegocioException($"A dupla vencedora deve alcançar no mínimo {competicao.ObterPontosMinimosPartida()} pontos.");
        }

        if (partida.ObterDiferencaPlacar() < competicao.ObterDiferencaMinimaPartida())
        {
            throw new RegraNegocioException($"A partida deve terminar com diferença mínima de {competicao.ObterDiferencaMinimaPartida()} pontos.");
        }

        if (partida.ObterDuplaVencedoraPorPlacar() != partida.DuplaVencedoraId)
        {
            throw new RegraNegocioException("A dupla vencedora deve ser coerente com o placar informado.");
        }
    }

    private async Task<IReadOnlyList<Dupla>> ResolverDuplasInscritasAsync(
        IReadOnlyList<InscricaoCampeonato> inscricoes,
        CancellationToken cancellationToken)
    {
        var duplas = new List<Dupla>();

        foreach (var inscricao in inscricoes)
        {
            var dupla = await duplaRepositorio.ObterPorIdAsync(inscricao.DuplaId, cancellationToken);

            if (dupla is null)
            {
                throw new RegraNegocioException($"A dupla da inscrição {inscricao.Dupla?.Nome ?? inscricao.DuplaId.ToString()} não foi encontrada no cadastro.");
            }

            if (duplas.All(x => x.Id != dupla.Id))
            {
                duplas.Add(dupla);
            }
        }

        return duplas;
    }

    private static List<Partida> GerarPartidasCategoria(CategoriaCompeticao categoria, IReadOnlyList<Dupla> duplasInscritas)
    {
        var duplasSorteadas = duplasInscritas
            .OrderBy(_ => Random.Shared.Next())
            .ToList();

        var formato = categoria.FormatoCampeonato;
        if (categoria.Competicao.Tipo == TipoCompeticao.Campeonato && formato is not null)
        {
            if (!formato.Ativo)
            {
                throw new RegraNegocioException("O formato vinculado à categoria está inativo.");
            }

            return formato.TipoFormato switch
            {
                TipoFormatoCampeonato.PontosCorridos => GerarPartidasPontosCorridos(categoria, duplasSorteadas, formato.TurnoEVolta),
                TipoFormatoCampeonato.FaseDeGrupos => GerarPartidasFaseDeGrupos(categoria, duplasSorteadas, formato),
                TipoFormatoCampeonato.Chave => GerarPartidasChave(categoria, duplasSorteadas, formato),
                _ => throw new RegraNegocioException("O formato da categoria é inválido para geração da tabela.")
            };
        }

        return GerarPrimeiraRodadaRoundRobin(categoria, duplasSorteadas, null, false);
    }

    private static List<Partida> GerarPartidasPontosCorridos(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        bool turnoEVolta)
    {
        return GerarPrimeiraRodadaRoundRobin(categoria, duplas, "Fase classificatória", turnoEVolta);
    }

    private static List<Partida> GerarPartidasFaseDeGrupos(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        FormatoCampeonato formato)
    {
        var quantidadeGrupos = formato.QuantidadeGrupos
            ?? throw new RegraNegocioException("O formato em fase de grupos precisa informar a quantidade de grupos.");

        if (quantidadeGrupos <= 0)
        {
            throw new RegraNegocioException("Quantidade de grupos inválida para gerar a tabela.");
        }

        if (duplas.Count < quantidadeGrupos * 2)
        {
            throw new RegraNegocioException("É necessário ter ao menos duas duplas por grupo para gerar a fase de grupos.");
        }

        var grupos = DistribuirDuplasEmGrupos(duplas, quantidadeGrupos);
        var partidas = new List<Partida>();

        for (var indiceGrupo = 0; indiceGrupo < grupos.Count; indiceGrupo++)
        {
            var nomeGrupo = $"Grupo {(char)('A' + indiceGrupo)}";
            partidas.AddRange(GerarPrimeiraRodadaRoundRobin(categoria, grupos[indiceGrupo], nomeGrupo, formato.TurnoEVolta));
        }

        return partidas;
    }

    private static List<Partida> GerarPartidasChave(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        FormatoCampeonato formato)
    {
        var (chaveA, chaveB) = DistribuirDuplasEmDuasChaves(duplas);

        if (chaveA.Count < 2 || chaveB.Count < 2)
        {
            throw new RegraNegocioException("A chave precisa de ao menos duas duplas em cada lado para gerar os jogos iniciais.");
        }

        var partidas = new List<Partida>();
        partidas.AddRange(GerarPartidasRodadaChave(categoria, chaveA, "A", 1));
        partidas.AddRange(GerarPartidasRodadaChave(categoria, chaveB, "B", 1));
        return partidas;
    }

    private static (List<Dupla> chaveA, List<Dupla> chaveB) DistribuirDuplasEmDuasChaves(IReadOnlyList<Dupla> duplas)
    {
        var metadeSuperior = (int)Math.Ceiling(duplas.Count / 2d);
        var chaveA = duplas.Take(metadeSuperior).ToList();
        var chaveB = duplas.Skip(metadeSuperior).ToList();
        return (chaveA, chaveB);
    }

    private static List<List<Dupla>> DistribuirDuplasEmGrupos(IReadOnlyList<Dupla> duplas, int quantidadeGrupos)
    {
        var grupos = Enumerable.Range(0, quantidadeGrupos)
            .Select(_ => new List<Dupla>())
            .ToList();

        foreach (var item in duplas.Select((dupla, indice) => new { dupla, indice }))
        {
            var ciclo = item.indice / quantidadeGrupos;
            var deslocamento = item.indice % quantidadeGrupos;
            var indiceGrupo = ciclo % 2 == 0
                ? deslocamento
                : quantidadeGrupos - 1 - deslocamento;

            grupos[indiceGrupo].Add(item.dupla);
        }

        return grupos;
    }

    private static List<Partida> GerarPrimeiraRodadaRoundRobin(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        string? nomeFaseBase,
        bool turnoEVolta)
    {
        var ordemDuplas = duplas.Select(x => x.Id).ToList();
        var rodadasBase = GerarRodadasRoundRobin(duplas);
        return rodadasBase.Count == 0
            ? []
            : CriarPartidasDaRodadaRoundRobin(categoria, rodadasBase, 1, nomeFaseBase, turnoEVolta, ordemDuplas);
    }

    private static List<RodadaRoundRobin> GerarRodadasRoundRobin(IReadOnlyList<Dupla> duplas)
    {
        var trabalho = duplas.ToList();
        var usaFolga = trabalho.Count % 2 != 0;
        if (usaFolga)
        {
            trabalho.Add(null!);
        }

        var quantidadeEquipes = trabalho.Count;
        var quantidadeRodadas = quantidadeEquipes - 1;
        var jogosPorRodada = quantidadeEquipes / 2;
        var rodadas = new List<RodadaRoundRobin>();

        for (var numeroRodada = 1; numeroRodada <= quantidadeRodadas; numeroRodada++)
        {
            var confrontos = new List<ConfrontoRoundRobin>();

            for (var indiceJogo = 0; indiceJogo < jogosPorRodada; indiceJogo++)
            {
                var duplaA = trabalho[indiceJogo];
                var duplaB = trabalho[quantidadeEquipes - 1 - indiceJogo];

                if (duplaA is null || duplaB is null)
                {
                    continue;
                }

                confrontos.Add(new ConfrontoRoundRobin(duplaA, duplaB));
            }

            rodadas.Add(new RodadaRoundRobin(numeroRodada, confrontos));

            var ultimo = trabalho[^1];
            for (var indice = quantidadeEquipes - 1; indice > 1; indice--)
            {
                trabalho[indice] = trabalho[indice - 1];
            }

            trabalho[1] = ultimo;
        }

        return rodadas;
    }

    private static List<Partida> CriarPartidasDaRodadaRoundRobin(
        CategoriaCompeticao categoria,
        IReadOnlyList<RodadaRoundRobin> rodadasBase,
        int numeroRodada,
        string? nomeFaseBase,
        bool turnoEVolta,
        IReadOnlyList<Guid> ordemDuplas)
    {
        if (numeroRodada <= 0)
        {
            return [];
        }

        var quantidadeRodadasBase = rodadasBase.Count;
        var quantidadeRodadasTotal = turnoEVolta ? quantidadeRodadasBase * 2 : quantidadeRodadasBase;
        if (numeroRodada > quantidadeRodadasTotal)
        {
            return [];
        }

        var rodadaBaseIndice = numeroRodada <= quantidadeRodadasBase
            ? numeroRodada - 1
            : numeroRodada - quantidadeRodadasBase - 1;
        var ehRodadaRetorno = turnoEVolta && numeroRodada > quantidadeRodadasBase;
        var rodadaBase = rodadasBase[rodadaBaseIndice];
        var metadados = new MetadadosRodada(
            nomeFaseBase,
            numeroRodada,
            0,
            turnoEVolta,
            ordemDuplas);

        return rodadaBase.Confrontos
            .Select((confronto, indice) => CriarPartidaAgendada(
                categoria,
                ehRodadaRetorno ? confronto.DuplaB : confronto.DuplaA,
                ehRodadaRetorno ? confronto.DuplaA : confronto.DuplaB,
                MontarNomeFaseRodada(categoria, nomeFaseBase, numeroRodada),
                null,
                metadados with { OrdemConfronto = indice + 1 }))
            .ToList();
    }

    private static string? MontarNomeFaseRodada(CategoriaCompeticao categoria, string? nomeFaseBase, int numeroRodada)
    {
        if (string.IsNullOrWhiteSpace(nomeFaseBase))
        {
            return categoria.Competicao.Tipo == TipoCompeticao.Campeonato
                ? $"Rodada {numeroRodada:00}"
                : null;
        }

        return $"{nomeFaseBase} - Rodada {numeroRodada:00}";
    }

    private static Partida CriarPartidaAgendada(
        CategoriaCompeticao categoria,
        Dupla duplaA,
        Dupla duplaB,
        string? faseCampeonato,
        MetadadosChave? metadadosChave = null,
        MetadadosRodada? metadadosRodada = null)
    {
        return new Partida
        {
            CategoriaCompeticaoId = categoria.Id,
            CategoriaCompeticao = categoria,
            DuplaAId = duplaA.Id,
            DuplaA = duplaA,
            DuplaBId = duplaB.Id,
            DuplaB = duplaB,
            FaseCampeonato = faseCampeonato,
            Status = StatusPartida.Agendada,
            PlacarDuplaA = 0,
            PlacarDuplaB = 0,
            DuplaVencedoraId = null,
            DataPartida = null,
            Observacoes = MontarObservacoesPartida("Tabela gerada automaticamente.", metadadosChave, metadadosRodada)
        };
    }

    private static string MontarResumoGeracao(
        CategoriaCompeticao categoria,
        FormatoCampeonato? formato,
        int quantidadeDuplas,
        IReadOnlyList<Partida> partidasGeradas)
    {
        if (categoria.Competicao.Tipo == TipoCompeticao.Evento || formato is null)
        {
            return $"Jogos iniciais sorteados com {partidasGeradas.Count} confronto(s) para {quantidadeDuplas} duplas na categoria {categoria.Nome}. As próximas rodadas serão abertas conforme os resultados.";
        }

        if (formato.TipoFormato == TipoFormatoCampeonato.FaseDeGrupos && formato.GeraMataMataAposGrupos)
        {
            return $"Primeira rodada da fase de grupos sorteada com {partidasGeradas.Count} jogo(s) para {quantidadeDuplas} duplas. As próximas rodadas serão abertas conforme os resultados.";
        }

        if (formato.TipoFormato == TipoFormatoCampeonato.Chave && formato.QuantidadeDerrotasParaEliminacao == 2)
        {
            return $"Jogos iniciais sorteados em duas chaves para {quantidadeDuplas} duplas na categoria {categoria.Nome}. As próximas partidas serão abertas conforme os resultados.";
        }

        if (formato.TipoFormato == TipoFormatoCampeonato.Chave)
        {
            return $"Jogos iniciais sorteados em duas chaves para {quantidadeDuplas} duplas na categoria {categoria.Nome}. As próximas partidas serão abertas conforme os resultados.";
        }

        return $"Jogos iniciais sorteados com {partidasGeradas.Count} confronto(s) para {quantidadeDuplas} duplas na categoria {categoria.Nome}. As próximas rodadas serão abertas conforme os resultados.";
    }

    private static string? NormalizarFaseCampeonato(string? faseCampeonato)
    {
        if (string.IsNullOrWhiteSpace(faseCampeonato))
        {
            return null;
        }

        return string.Join(
            ' ',
            faseCampeonato.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    private async Task GarantirEdicaoPartidasAsync(Competicao competicao, CancellationToken cancellationToken)
    {
        if (competicao.Tipo == TipoCompeticao.Grupo)
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(competicao.Id, cancellationToken);
            return;
        }

        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        if (usuario.Perfil == PerfilUsuario.Administrador)
        {
            return;
        }

        if (usuario.Perfil != PerfilUsuario.Organizador || competicao.UsuarioOrganizadorId != usuario.Id)
        {
            throw new RegraNegocioException("Somente administradores ou o organizador da competição podem sortear jogos, preencher resultados ou alterar confrontos.");
        }
    }

    private async Task ProcessarAvancoRodadasAsync(CategoriaCompeticao categoria, CancellationToken cancellationToken)
    {
        var formato = categoria.FormatoCampeonato;
        if (categoria.Competicao.Tipo == TipoCompeticao.Grupo ||
            formato?.TipoFormato == TipoFormatoCampeonato.Chave)
        {
            return;
        }

        var partidasCategoria = await partidaRepositorio.ListarPorCategoriaAsync(categoria.Id, cancellationToken);
        var partidasPorFase = partidasCategoria
            .Select(partida => new { Partida = partida, Metadados = ExtrairMetadadosRodada(partida.Observacoes) })
            .Where(x => x.Metadados is not null)
            .Select(x => new PartidaRodada(x.Partida, x.Metadados!))
            .GroupBy(x => x.Metadados.NomeFaseBase ?? string.Empty)
            .ToList();

        if (partidasPorFase.Count == 0)
        {
            return;
        }

        var novasPartidas = new List<Partida>();

        foreach (var grupo in partidasPorFase)
        {
            var referencia = grupo.First().Metadados;
            var rodadaAtual = grupo.Max(x => x.Metadados.NumeroRodada);
            var partidasRodadaAtual = grupo
                .Where(x => x.Metadados.NumeroRodada == rodadaAtual)
                .OrderBy(x => x.Metadados.OrdemConfronto)
                .ToList();

            if (partidasRodadaAtual.Any(x => x.Partida.Status != StatusPartida.Encerrada))
            {
                continue;
            }

            if (grupo.Any(x => x.Metadados.NumeroRodada == rodadaAtual + 1))
            {
                continue;
            }

            var duplasOrdenadas = await ResolverDuplasPorIdsAsync(referencia.OrdemDuplas, cancellationToken);
            var rodadasBase = GerarRodadasRoundRobin(duplasOrdenadas);
            novasPartidas.AddRange(CriarPartidasDaRodadaRoundRobin(
                categoria,
                rodadasBase,
                rodadaAtual + 1,
                referencia.NomeFaseBase,
                referencia.TurnoEVolta,
                referencia.OrdemDuplas));
        }

        if (novasPartidas.Count == 0)
        {
            return;
        }

        foreach (var novaPartida in novasPartidas)
        {
            await partidaRepositorio.AdicionarAsync(novaPartida, cancellationToken);
        }

        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task ProcessarAvancoChaveAsync(CategoriaCompeticao categoria, CancellationToken cancellationToken)
    {
        var formato = categoria.FormatoCampeonato;
        if (categoria.Competicao.Tipo != TipoCompeticao.Campeonato ||
            formato is null ||
            formato.TipoFormato != TipoFormatoCampeonato.Chave)
        {
            return;
        }

        var partidasCategoria = await partidaRepositorio.ListarPorCategoriaAsync(categoria.Id, cancellationToken);
        var partidasChave = partidasCategoria
            .Select(partida => new { Partida = partida, Metadados = ExtrairMetadadosChave(partida.Observacoes) })
            .Where(x => x.Metadados is not null)
            .Select(x => new PartidaChave(x.Partida, x.Metadados!))
            .ToList();

        var novasPartidas = new List<Partida>();

        novasPartidas.AddRange(await GerarProximaRodadaChaveSeNecessarioAsync(categoria, partidasChave, "A", cancellationToken));
        novasPartidas.AddRange(await GerarProximaRodadaChaveSeNecessarioAsync(categoria, partidasChave, "B", cancellationToken));

        var campeaoChaveA = await ObterCampeaoChaveAsync(partidasChave, "A", cancellationToken);
        var campeaoChaveB = await ObterCampeaoChaveAsync(partidasChave, "B", cancellationToken);
        if (campeaoChaveA is not null &&
            campeaoChaveB is not null &&
            partidasCategoria.All(x => !string.Equals(x.FaseCampeonato, NomeFaseFinal, StringComparison.OrdinalIgnoreCase)) &&
            novasPartidas.All(x => !string.Equals(x.FaseCampeonato, NomeFaseFinal, StringComparison.OrdinalIgnoreCase)))
        {
            novasPartidas.Add(CriarPartidaAgendada(categoria, campeaoChaveA, campeaoChaveB, NomeFaseFinal));
        }

        if (formato.DisputaTerceiroLugar &&
            partidasCategoria.All(x => !string.Equals(x.FaseCampeonato, NomeFaseTerceiroLugar, StringComparison.OrdinalIgnoreCase)) &&
            novasPartidas.All(x => !string.Equals(x.FaseCampeonato, NomeFaseTerceiroLugar, StringComparison.OrdinalIgnoreCase)))
        {
            var viceChaveA = await ObterViceCampeaoChaveAsync(partidasChave, "A", cancellationToken);
            var viceChaveB = await ObterViceCampeaoChaveAsync(partidasChave, "B", cancellationToken);

            if (viceChaveA is not null && viceChaveB is not null)
            {
                novasPartidas.Add(CriarPartidaAgendada(categoria, viceChaveA, viceChaveB, NomeFaseTerceiroLugar));
            }
        }

        if (novasPartidas.Count == 0)
        {
            return;
        }

        foreach (var novaPartida in novasPartidas)
        {
            await partidaRepositorio.AdicionarAsync(novaPartida, cancellationToken);
        }

        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<Partida>> GerarProximaRodadaChaveSeNecessarioAsync(
        CategoriaCompeticao categoria,
        IReadOnlyList<PartidaChave> partidasChave,
        string lado,
        CancellationToken cancellationToken)
    {
        var partidasLado = partidasChave
            .Where(x => string.Equals(x.Metadados.Lado, lado, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (partidasLado.Count == 0)
        {
            return [];
        }

        var rodadaAtual = partidasLado.Max(x => x.Metadados.Rodada);
        var partidasRodadaAtual = partidasLado
            .Where(x => x.Metadados.Rodada == rodadaAtual)
            .OrderBy(x => x.Metadados.Ordem)
            .ToList();

        if (partidasRodadaAtual.Any(x => x.Partida.Status != StatusPartida.Encerrada || !x.Partida.DuplaVencedoraId.HasValue))
        {
            return [];
        }

        var idsDuplasEmEspera = partidasRodadaAtual
            .SelectMany(x => x.Metadados.DuplasEmEspera)
            .Distinct()
            .ToList();

        var duplasEmEspera = await ResolverDuplasPorIdsAsync(idsDuplasEmEspera, cancellationToken);
        var vencedores = await ResolverDuplasPorIdsAsync(
            partidasRodadaAtual
                .Select(x => x.Partida.DuplaVencedoraId!.Value)
                .Distinct()
                .ToList(),
            cancellationToken);

        var classificados = duplasEmEspera
            .Concat(vencedores)
            .ToList();

        if (classificados.Count <= 1)
        {
            return [];
        }

        return GerarPartidasRodadaChave(categoria, classificados, lado, rodadaAtual + 1);
    }

    private async Task<Dupla?> ObterCampeaoChaveAsync(
        IReadOnlyList<PartidaChave> partidasChave,
        string lado,
        CancellationToken cancellationToken)
    {
        var rodadaFinal = ObterRodadaMaisAltaConcluida(partidasChave, lado);
        if (rodadaFinal is null)
        {
            return null;
        }

        var idsClassificados = rodadaFinal
            .SelectMany(x => x.Metadados.DuplasEmEspera)
            .Concat(rodadaFinal
                .Where(x => x.Partida.DuplaVencedoraId.HasValue)
                .Select(x => x.Partida.DuplaVencedoraId!.Value))
            .Distinct()
            .ToList();

        if (idsClassificados.Count != 1)
        {
            return null;
        }

        var duplas = await ResolverDuplasPorIdsAsync(idsClassificados, cancellationToken);
        return duplas.SingleOrDefault();
    }

    private async Task<Dupla?> ObterViceCampeaoChaveAsync(
        IReadOnlyList<PartidaChave> partidasChave,
        string lado,
        CancellationToken cancellationToken)
    {
        var rodadaFinal = ObterRodadaMaisAltaConcluida(partidasChave, lado);
        if (rodadaFinal is null || rodadaFinal.Count != 1)
        {
            return null;
        }

        var partidaFinal = rodadaFinal[0].Partida;
        if (!partidaFinal.DuplaVencedoraId.HasValue)
        {
            return null;
        }

        var duplaViceId = partidaFinal.DuplaAId == partidaFinal.DuplaVencedoraId.Value
            ? partidaFinal.DuplaBId
            : partidaFinal.DuplaAId;

        var duplas = await ResolverDuplasPorIdsAsync([duplaViceId], cancellationToken);
        return duplas.SingleOrDefault();
    }

    private static IReadOnlyList<PartidaChave>? ObterRodadaMaisAltaConcluida(
        IReadOnlyList<PartidaChave> partidasChave,
        string lado)
    {
        var partidasLado = partidasChave
            .Where(x => string.Equals(x.Metadados.Lado, lado, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (partidasLado.Count == 0)
        {
            return null;
        }

        var rodadaMaisAlta = partidasLado.Max(x => x.Metadados.Rodada);
        var partidasRodada = partidasLado
            .Where(x => x.Metadados.Rodada == rodadaMaisAlta)
            .OrderBy(x => x.Metadados.Ordem)
            .ToList();

        if (partidasRodada.Any(x => x.Partida.Status != StatusPartida.Encerrada || !x.Partida.DuplaVencedoraId.HasValue))
        {
            return null;
        }

        return partidasRodada;
    }

    private async Task<IReadOnlyList<Dupla>> ResolverDuplasPorIdsAsync(
        IReadOnlyList<Guid> idsDuplas,
        CancellationToken cancellationToken)
    {
        var duplas = new List<Dupla>();

        foreach (var idDupla in idsDuplas)
        {
            var dupla = await duplaRepositorio.ObterPorIdAsync(idDupla, cancellationToken);
            if (dupla is null)
            {
                throw new RegraNegocioException("Uma das duplas da chave não foi encontrada para avançar a tabela.");
            }

            duplas.Add(dupla);
        }

        return duplas;
    }

    private static List<Partida> GerarPartidasRodadaChave(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        string lado,
        int rodada)
    {
        var tamanhoChave = 1;
        while (tamanhoChave < duplas.Count)
        {
            tamanhoChave *= 2;
        }

        var quantidadeByes = tamanhoChave - duplas.Count;
        var duplasEmEspera = duplas.Take(quantidadeByes).ToList();
        var duplasComJogo = duplas.Skip(quantidadeByes).ToList();
        if (duplasComJogo.Count < 2)
        {
            throw new RegraNegocioException("Não há confrontos suficientes para gerar a rodada da chave.");
        }

        var partidas = new List<Partida>();
        var nomeFase = $"Chave {lado.ToUpperInvariant()} - Rodada {rodada:00}";
        var idsDuplasEmEspera = duplasEmEspera.Select(x => x.Id).ToList();

        for (var indice = 0; indice + 1 < duplasComJogo.Count; indice += 2)
        {
            partidas.Add(CriarPartidaAgendada(
                categoria,
                duplasComJogo[indice],
                duplasComJogo[indice + 1],
                nomeFase,
                new MetadadosChave(lado.ToUpperInvariant(), rodada, (indice / 2) + 1, idsDuplasEmEspera)));
        }

        return partidas;
    }

    private static string MontarObservacoesPartida(
        string? observacaoUsuario,
        MetadadosChave? metadadosChave,
        MetadadosRodada? metadadosRodada = null)
    {
        var observacaoNormalizada = string.IsNullOrWhiteSpace(observacaoUsuario)
            ? null
            : observacaoUsuario.Trim();

        var linhasMetadados = new List<string>();

        if (metadadosChave is not null)
        {
            linhasMetadados.Add($"{MarcadorMetadadosChave}{metadadosChave.Lado};{metadadosChave.Rodada};{metadadosChave.Ordem};{string.Join(',', metadadosChave.DuplasEmEspera)}]]");
        }

        if (metadadosRodada is not null)
        {
            linhasMetadados.Add($"{MarcadorMetadadosRodada}{metadadosRodada.NomeFaseBase};{metadadosRodada.NumeroRodada};{metadadosRodada.OrdemConfronto};{(metadadosRodada.TurnoEVolta ? 1 : 0)};{string.Join(',', metadadosRodada.OrdemDuplas)}]]");
        }

        if (linhasMetadados.Count == 0)
        {
            return observacaoNormalizada ?? string.Empty;
        }

        return string.IsNullOrWhiteSpace(observacaoNormalizada)
            ? string.Join('\n', linhasMetadados)
            : $"{observacaoNormalizada}\n{string.Join('\n', linhasMetadados)}";
    }

    private static MetadadosChave? ExtrairMetadadosChave(string? observacoes)
    {
        if (string.IsNullOrWhiteSpace(observacoes))
        {
            return null;
        }

        var linhas = observacoes
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var linhaMetadados = linhas.LastOrDefault(x => x.StartsWith(MarcadorMetadadosChave, StringComparison.Ordinal));
        if (string.IsNullOrWhiteSpace(linhaMetadados))
        {
            return null;
        }

        var conteudo = linhaMetadados
            .Replace(MarcadorMetadadosChave, string.Empty, StringComparison.Ordinal)
            .Replace("]]", string.Empty, StringComparison.Ordinal);
        var partes = conteudo.Split(';');
        if (partes.Length < 4 ||
            !int.TryParse(partes[1], out var rodada) ||
            !int.TryParse(partes[2], out var ordem))
        {
            return null;
        }

        var idsDuplasEmEspera = partes[3]
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(valor => Guid.TryParse(valor, out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .ToList();

        return new MetadadosChave(partes[0], rodada, ordem, idsDuplasEmEspera);
    }

    private static MetadadosRodada? ExtrairMetadadosRodada(string? observacoes)
    {
        if (string.IsNullOrWhiteSpace(observacoes))
        {
            return null;
        }

        var linhas = observacoes
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var linhaMetadados = linhas.LastOrDefault(x => x.StartsWith(MarcadorMetadadosRodada, StringComparison.Ordinal));
        if (string.IsNullOrWhiteSpace(linhaMetadados))
        {
            return null;
        }

        var conteudo = linhaMetadados
            .Replace(MarcadorMetadadosRodada, string.Empty, StringComparison.Ordinal)
            .Replace("]]", string.Empty, StringComparison.Ordinal);
        var partes = conteudo.Split(';');
        if (partes.Length < 5 ||
            !int.TryParse(partes[1], out var numeroRodada) ||
            !int.TryParse(partes[2], out var ordemConfronto) ||
            !int.TryParse(partes[3], out var turnoEVoltaInt))
        {
            return null;
        }

        var ordemDuplas = partes[4]
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(valor => Guid.TryParse(valor, out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .ToList();

        if (ordemDuplas.Count == 0)
        {
            return null;
        }

        var nomeFaseBase = string.IsNullOrWhiteSpace(partes[0]) ? null : partes[0];
        return new MetadadosRodada(nomeFaseBase, numeroRodada, ordemConfronto, turnoEVoltaInt == 1, ordemDuplas);
    }

    private sealed record MetadadosChave(string Lado, int Rodada, int Ordem, IReadOnlyList<Guid> DuplasEmEspera);
    private sealed record ConfrontoRoundRobin(Dupla DuplaA, Dupla DuplaB);
    private sealed record PartidaChave(Partida Partida, MetadadosChave Metadados);
    private sealed record MetadadosRodada(string? NomeFaseBase, int NumeroRodada, int OrdemConfronto, bool TurnoEVolta, IReadOnlyList<Guid> OrdemDuplas);
    private sealed record PartidaRodada(Partida Partida, MetadadosRodada Metadados);
    private sealed record RodadaRoundRobin(int Numero, IReadOnlyList<ConfrontoRoundRobin> Confrontos);
}
