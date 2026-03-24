using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
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
    IUnidadeTrabalho unidadeTrabalho
) : IPartidaServico
{
    public async Task<IReadOnlyList<PartidaDto>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default)
    {
        var partidas = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        return partidas.Select(x => x.ParaDto()).ToList();
    }

    public async Task<PartidaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var partida = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (partida is null)
        {
            throw new EntidadeNaoEncontradaException("Partida não encontrada.");
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

        if (categoria.Competicao.Tipo != TipoCompeticao.Campeonato)
        {
            throw new RegraNegocioException("A geração de tabela automática está disponível apenas para categorias de campeonato.");
        }

        var formato = categoria.FormatoCampeonato
            ?? throw new RegraNegocioException("Vincule um formato de campeonato na categoria antes de gerar a tabela de jogos.");

        if (!formato.Ativo)
        {
            throw new RegraNegocioException("O formato vinculado à categoria está inativo.");
        }

        var partidasExistentes = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        if (partidasExistentes.Any(x => x.Status == StatusPartida.Encerrada))
        {
            throw new RegraNegocioException("A categoria já possui partidas encerradas. Remova ou ajuste a tabela manualmente antes de gerar novamente.");
        }

        if (partidasExistentes.Count > 0 && !dto.SubstituirTabelaExistente)
        {
            throw new RegraNegocioException("A categoria já possui uma tabela de jogos gerada. Use a substituição para gerar novamente.");
        }

        if (partidasExistentes.Count > 0)
        {
            foreach (var partidaExistente in partidasExistentes)
            {
                partidaRepositorio.Remover(partidaExistente);
            }

            await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        }

        var inscricoes = await inscricaoRepositorio.ListarPorCampeonatoAsync(
            categoria.CompeticaoId,
            categoriaId,
            cancellationToken);

        var duplasInscritas = await ResolverDuplasInscritasAsync(inscricoes, cancellationToken);
        if (duplasInscritas.Count < 2)
        {
            throw new RegraNegocioException("A categoria precisa ter ao menos duas duplas inscritas para gerar a tabela de jogos.");
        }

        var partidasGeradas = GerarPartidasCategoria(categoria, duplasInscritas);
        foreach (var partida in partidasGeradas)
        {
            await partidaRepositorio.AdicionarAsync(partida, cancellationToken);
        }

        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var partidasAtualizadas = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        return new GeracaoTabelaCategoriaDto(
            categoria.Id,
            categoria.Nome,
            partidasGeradas.Count,
            partidasExistentes.Count > 0,
            MontarResumoGeracao(categoria, formato, duplasInscritas.Count, partidasGeradas),
            partidasAtualizadas.Select(x => x.ParaDto()).ToList());
    }

    public async Task<PartidaDto> CriarAsync(CriarPartidaDto dto, CancellationToken cancellationToken = default)
    {
        var categoria = await ValidarRelacionamentosAsync(
            dto.CategoriaCompeticaoId,
            dto.DuplaAId,
            dto.DuplaBId,
            cancellationToken
        );

        var partida = new Partida
        {
            CategoriaCompeticaoId = dto.CategoriaCompeticaoId,
            DuplaAId = dto.DuplaAId,
            DuplaBId = dto.DuplaBId,
            FaseCampeonato = NormalizarFaseCampeonato(dto.FaseCampeonato),
            Status = dto.Status,
            DataPartida = dto.DataPartida.HasValue ? NormalizarParaUtc(dto.DataPartida.Value) : null,
            Observacoes = dto.Observacoes?.Trim(),
            CategoriaCompeticao = categoria
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

        var categoria = await ValidarRelacionamentosAsync(
            dto.CategoriaCompeticaoId,
            dto.DuplaAId,
            dto.DuplaBId,
            cancellationToken
        );

        partida.CategoriaCompeticaoId = dto.CategoriaCompeticaoId;
        partida.DuplaAId = dto.DuplaAId;
        partida.DuplaBId = dto.DuplaBId;
        partida.FaseCampeonato = NormalizarFaseCampeonato(dto.FaseCampeonato);
        partida.Status = dto.Status;
        partida.DataPartida = dto.DataPartida.HasValue ? NormalizarParaUtc(dto.DataPartida.Value) : null;
        partida.Observacoes = dto.Observacoes?.Trim();
        partida.CategoriaCompeticao = categoria;

        AplicarStatusEResultado(partida, dto.Status, dto.PlacarDuplaA, dto.PlacarDuplaB, partida.DataPartida ?? DateTime.UtcNow);
        ValidarPartida(partida, categoria.Competicao);
        partida.AtualizarDataModificacao();

        partidaRepositorio.Atualizar(partida);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
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

        partidaRepositorio.Remover(partida);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
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

    private async Task<CategoriaCompeticao> ValidarRelacionamentosAsync(
        Guid categoriaCompeticaoId,
        Guid duplaAId,
        Guid duplaBId,
        CancellationToken cancellationToken
    )
    {
        if (duplaAId == duplaBId)
        {
            throw new RegraNegocioException("Uma partida não pode ter a mesma dupla em ambos os lados.");
        }

        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaCompeticaoId, cancellationToken);
        if (categoria is null)
        {
            throw new RegraNegocioException("Toda partida deve pertencer a uma categoria.");
        }

        var duplaA = await duplaRepositorio.ObterPorIdAsync(duplaAId, cancellationToken);
        var duplaB = await duplaRepositorio.ObterPorIdAsync(duplaBId, cancellationToken);
        if (duplaA is null || duplaB is null)
        {
            throw new RegraNegocioException("As duplas da partida devem estar cadastradas.");
        }

        if (categoria.Competicao.Tipo == TipoCompeticao.Campeonato)
        {
            await ValidarInscricaoCampeonatoAsync(categoria.Id, duplaA, cancellationToken);
            await ValidarInscricaoCampeonatoAsync(categoria.Id, duplaB, cancellationToken);
        }

        return categoria;
    }

    private async Task ValidarInscricaoCampeonatoAsync(
        Guid categoriaId,
        Dupla dupla,
        CancellationToken cancellationToken)
    {
        var inscricao = await inscricaoRepositorio.ObterDuplicadaAsync(
            categoriaId,
            dupla.Atleta1Id,
            dupla.Atleta2Id,
            cancellationToken);

        if (inscricao is null)
        {
            throw new RegraNegocioException($"A dupla {dupla.Nome} precisa estar inscrita nesta categoria do campeonato.");
        }
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
            var dupla = await duplaRepositorio.ObterPorAtletasAsync(
                inscricao.Atleta1Id,
                inscricao.Atleta2Id,
                cancellationToken);

            if (dupla is null)
            {
                throw new RegraNegocioException($"A dupla da inscrição {inscricao.Atleta1.Nome} / {inscricao.Atleta2.Nome} não foi encontrada no cadastro.");
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
        var formato = categoria.FormatoCampeonato!;
        var duplasSorteadas = duplasInscritas
            .OrderBy(_ => Random.Shared.Next())
            .ToList();

        return formato.TipoFormato switch
        {
            TipoFormatoCampeonato.PontosCorridos => GerarPartidasPontosCorridos(categoria, duplasSorteadas, formato.TurnoEVolta),
            TipoFormatoCampeonato.FaseDeGrupos => GerarPartidasFaseDeGrupos(categoria, duplasSorteadas, formato),
            TipoFormatoCampeonato.Chave => GerarPartidasChave(categoria, duplasSorteadas, formato),
            _ => throw new RegraNegocioException("O formato da categoria é inválido para geração da tabela.")
        };
    }

    private static List<Partida> GerarPartidasPontosCorridos(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        bool turnoEVolta)
    {
        return GerarPartidasRoundRobin(categoria, duplas, "Fase classificatória", turnoEVolta);
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
            partidas.AddRange(GerarPartidasRoundRobin(categoria, grupos[indiceGrupo], nomeGrupo, formato.TurnoEVolta));
        }

        return partidas;
    }

    private static List<Partida> GerarPartidasChave(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        FormatoCampeonato formato)
    {
        var partidas = new List<Partida>();
        var tamanhoChave = 1;
        while (tamanhoChave < duplas.Count)
        {
            tamanhoChave *= 2;
        }

        var byes = tamanhoChave - duplas.Count;
        var duplasComJogo = duplas.Skip(byes).ToList();
        if (duplasComJogo.Count < 2)
        {
            throw new RegraNegocioException("Não há confrontos suficientes para gerar a primeira rodada da chave.");
        }

        var fase = ObterNomeFaseEliminatoriaInicial(tamanhoChave, formato.QuantidadeDerrotasParaEliminacao);
        for (var indice = 0; indice + 1 < duplasComJogo.Count; indice += 2)
        {
            partidas.Add(CriarPartidaAgendada(
                categoria,
                duplasComJogo[indice],
                duplasComJogo[indice + 1],
                fase));
        }

        return partidas;
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

    private static List<Partida> GerarPartidasRoundRobin(
        CategoriaCompeticao categoria,
        IReadOnlyList<Dupla> duplas,
        string nomeFase,
        bool turnoEVolta)
    {
        var partidas = new List<Partida>();
        var rodadasBase = GerarRodadasRoundRobin(duplas);

        foreach (var rodada in rodadasBase)
        {
            partidas.AddRange(rodada.Confrontos.Select(confronto =>
                CriarPartidaAgendada(categoria, confronto.DuplaA, confronto.DuplaB, $"{nomeFase} - Rodada {rodada.Numero:00}")));
        }

        if (!turnoEVolta)
        {
            return partidas;
        }

        var proximaRodada = rodadasBase.Count + 1;
        foreach (var rodada in rodadasBase)
        {
            var numeroRodadaRetorno = proximaRodada++;
            partidas.AddRange(rodada.Confrontos.Select(confronto =>
                CriarPartidaAgendada(
                    categoria,
                    confronto.DuplaB,
                    confronto.DuplaA,
                    $"{nomeFase} - Rodada {numeroRodadaRetorno:00}")));
        }

        return partidas;
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

    private static Partida CriarPartidaAgendada(
        CategoriaCompeticao categoria,
        Dupla duplaA,
        Dupla duplaB,
        string faseCampeonato)
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
            Observacoes = "Tabela gerada automaticamente."
        };
    }

    private static string ObterNomeFaseEliminatoriaInicial(int tamanhoChave, int? quantidadeDerrotasParaEliminacao)
    {
        if (quantidadeDerrotasParaEliminacao == 2)
        {
            return "Chave principal - Rodada 01";
        }

        return tamanhoChave switch
        {
            2 => "Final",
            4 => "Semifinal",
            8 => "Quartas de final",
            16 => "Oitavas de final",
            _ => "Fase eliminatória"
        };
    }

    private static string MontarResumoGeracao(
        CategoriaCompeticao categoria,
        FormatoCampeonato formato,
        int quantidadeDuplas,
        IReadOnlyList<Partida> partidasGeradas)
    {
        if (formato.TipoFormato == TipoFormatoCampeonato.FaseDeGrupos && formato.GeraMataMataAposGrupos)
        {
            return $"Tabela gerada com {partidasGeradas.Count} jogos da fase de grupos para {quantidadeDuplas} duplas. O mata-mata será montado depois da classificação.";
        }

        if (formato.TipoFormato == TipoFormatoCampeonato.Chave && formato.QuantidadeDerrotasParaEliminacao == 2)
        {
            return $"Tabela inicial da chave principal gerada com {partidasGeradas.Count} confrontos para a categoria {categoria.Nome}. A chave dos perdedores depende dos resultados.";
        }

        return $"Tabela gerada com {partidasGeradas.Count} jogos para {quantidadeDuplas} duplas na categoria {categoria.Nome}.";
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

    private sealed record ConfrontoRoundRobin(Dupla DuplaA, Dupla DuplaB);

    private sealed record RodadaRoundRobin(int Numero, IReadOnlyList<ConfrontoRoundRobin> Confrontos);
}
