using System.Globalization;
using System.Text;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Utilitarios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class RankingServico(
    ILigaRepositorio ligaRepositorio,
    ICompeticaoRepositorio competicaoRepositorio,
    IPartidaRepositorio partidaRepositorio,
    IGrupoAtletaRepositorio grupoAtletaRepositorio,
    IAutorizacaoUsuarioServico autorizacaoUsuarioServico
) : IRankingServico
{
    public async Task<RankingFiltroInicialDto> ObterFiltroInicialAsync(
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualAsync(cancellationToken);

        if (usuario is null)
        {
            return new RankingFiltroInicialDto("geral", null);
        }

        if (usuario.Perfil != PerfilUsuario.Atleta)
        {
            return new RankingFiltroInicialDto("geral", null);
        }

        Guid? competicaoId = usuario.Perfil switch
        {
            PerfilUsuario.Atleta when usuario.AtletaId.HasValue => await partidaRepositorio.ObterUltimaCompeticaoComPartidaEncerradaAsync(
                null,
                usuario.AtletaId.Value,
                cancellationToken),
            PerfilUsuario.Organizador => await partidaRepositorio.ObterUltimaCompeticaoComPartidaEncerradaAsync(
                usuario.Id,
                null,
                cancellationToken),
            _ => await partidaRepositorio.ObterUltimaCompeticaoComPartidaEncerradaAsync(
                null,
                null,
                cancellationToken)
        };

        return new RankingFiltroInicialDto(
            competicaoId.HasValue ? "competicao" : null,
            competicaoId);
    }

    public async Task<IReadOnlyList<RankingCategoriaDto>> ListarAtletasGeralAsync(
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualAsync(cancellationToken);
        if (usuario?.Perfil == PerfilUsuario.Atleta)
        {
            throw new RegraNegocioException("Usuários com perfil atleta só podem visualizar o ranking dos grupos em que participam.");
        }

        var partidas = await partidaRepositorio.ListarParaRankingGeralAsync(
            usuario?.Perfil == PerfilUsuario.Organizador ? usuario.Id : null,
            cancellationToken);

        var rankingGeral = MontarRankingConsolidado(
            Guid.Empty,
            Guid.Empty,
            "Todas as competições",
            "Ranking geral",
            partidas);

        return rankingGeral is null ? [] : [rankingGeral];
    }

    public async Task<IReadOnlyList<RankingCategoriaDto>> ListarAtletasPorLigaAsync(
        Guid ligaId,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualAsync(cancellationToken);
        if (usuario?.Perfil == PerfilUsuario.Atleta)
        {
            throw new RegraNegocioException("Usuários com perfil atleta só podem visualizar o ranking dos grupos em que participam.");
        }

        var liga = await ligaRepositorio.ObterPorIdAsync(ligaId, cancellationToken);
        if (liga is null)
        {
            throw new EntidadeNaoEncontradaException("Liga não encontrada.");
        }

        var partidas = await partidaRepositorio.ListarParaRankingPorLigaAsync(ligaId, cancellationToken);
        var partidasSemCompeticaoOuCategoria = await partidaRepositorio.ListarParaRankingSemCompeticaoOuCategoriaAsync(
            usuario?.Perfil == PerfilUsuario.Organizador ? usuario.Id : null,
            cancellationToken);
        return MontarRankingLiga(ligaId, liga.Nome, partidas, partidasSemCompeticaoOuCategoria);
    }

    public async Task<IReadOnlyList<RankingCategoriaDto>> ListarAtletasPorCompeticaoAsync(
        Guid competicaoId,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualAsync(cancellationToken);
        var competicao = await competicaoRepositorio.ObterPorIdAsync(competicaoId, cancellationToken);
        if (competicao is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        if (usuario?.Perfil == PerfilUsuario.Atleta)
        {
            if (competicao.Tipo != TipoCompeticao.Grupo)
            {
                throw new RegraNegocioException("Usuários com perfil atleta só podem visualizar o ranking dos grupos em que participam.");
            }

            if (!usuario.AtletaId.HasValue)
            {
                throw new RegraNegocioException("Seu usuário não possui atleta vinculado para consultar o ranking do grupo.");
            }

            var grupoAtleta = await grupoAtletaRepositorio.ObterPorCompeticaoEAtletaAsync(
                competicaoId,
                usuario.AtletaId.Value,
                cancellationToken);

            if (grupoAtleta is null)
            {
                throw new RegraNegocioException("Você só pode visualizar o ranking dos grupos em que participa.");
            }
        }

        var partidas = await partidaRepositorio.ListarParaRankingPorCompeticaoAsync(competicaoId, cancellationToken);
        return MontarRankingPorCategoria(partidas);
    }

    private static IReadOnlyList<RankingCategoriaDto> MontarRankingLiga(
        Guid ligaId,
        string nomeLiga,
        IReadOnlyList<Partida> partidasLiga,
        IReadOnlyList<Partida> partidasSemCompeticaoOuCategoria)
    {
        var categorias = new List<RankingCategoriaDto>();
        var rankingLiga = MontarRankingConsolidado(
            ligaId,
            ligaId,
            nomeLiga,
            "Ranking geral da liga",
            partidasLiga);
        if (rankingLiga is not null)
        {
            categorias.Add(rankingLiga);
        }

        var rankingSemCompeticaoOuCategoria = MontarRankingConsolidado(
            Guid.Empty,
            Guid.Empty,
            "Jogos sem liga",
            "Partidas sem competição/categoria",
            partidasSemCompeticaoOuCategoria);
        if (rankingSemCompeticaoOuCategoria is not null)
        {
            categorias.Add(rankingSemCompeticaoOuCategoria);
        }

        return categorias;
    }

    private static RankingCategoriaDto? MontarRankingConsolidado(
        Guid categoriaId,
        Guid competicaoId,
        string nomeCompeticao,
        string nomeCategoria,
        IReadOnlyList<Partida> partidas)
    {
        if (partidas.Count == 0)
        {
            return null;
        }

        var atletas = new Dictionary<Guid, RankingAtletaAcumulado>();
        var participacoesAplicadas = new HashSet<(Guid AtletaId, Guid ReferenciaId)>();

        foreach (var partida in partidas)
        {
            var categoria = partida.CategoriaCompeticao;
            var competicao = categoria.Competicao;
            var dataPartida = partida.DataPartida ?? partida.DataCriacao;
            var peso = categoria.PesoRanking;
            var pontosParticipacao = competicao.ObterPontosParticipacao() * peso;
            var pontosVitoria = competicao.ObterPontosVitoria() * peso;
            var pontosDerrota = competicao.ObterPontosDerrota() * peso;
            var empate = partida.TerminouEmpatada();
            var vencedoraId = partida.ObterDuplaVencedoraPorPlacar();
            var confronto = $"{partida.DuplaA.Nome} {partida.PlacarDuplaA} x {partida.PlacarDuplaB} {partida.DuplaB.Nome}";

            Acumular(
                atletas,
                participacoesAplicadas,
                partida.DuplaA.Atleta1,
                competicao.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaAId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
            Acumular(
                atletas,
                participacoesAplicadas,
                partida.DuplaA.Atleta2,
                competicao.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaAId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
            Acumular(
                atletas,
                participacoesAplicadas,
                partida.DuplaB.Atleta1,
                competicao.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaBId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
            Acumular(
                atletas,
                participacoesAplicadas,
                partida.DuplaB.Atleta2,
                competicao.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaBId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
        }

        foreach (var partidasCategoria in partidas.GroupBy(x => x.CategoriaCompeticaoId))
        {
                AplicarPontuacaoColocacao(partidasCategoria.ToList(), atletas);
        }

        return new RankingCategoriaDto(
            categoriaId,
            competicaoId,
            nomeCompeticao,
            nomeCategoria,
            null,
            OrdenarAtletas(atletas));
    }

    private static IReadOnlyList<RankingCategoriaDto> MontarRankingPorCategoria(IReadOnlyList<Partida> partidas)
    {
        var acumuladoPorCategoria = new Dictionary<Guid, RankingCategoriaAcumulado>();
        var participacoesAplicadas = new HashSet<(Guid AtletaId, Guid ReferenciaId)>();

        foreach (var partida in partidas)
        {
            var categoria = partida.CategoriaCompeticao;
            var competicao = categoria.Competicao;
            var dataPartida = partida.DataPartida ?? partida.DataCriacao;
            if (!acumuladoPorCategoria.TryGetValue(categoria.Id, out var categoriaAcumulada))
            {
                categoriaAcumulada = new RankingCategoriaAcumulado(
                    categoria.Id,
                    categoria.CompeticaoId,
                    competicao.Nome,
                    categoria.Nome,
                    categoria.Genero);
                acumuladoPorCategoria[categoria.Id] = categoriaAcumulada;
            }

            var peso = categoria.PesoRanking;
            var pontosParticipacao = competicao.ObterPontosParticipacao() * peso;
            var pontosVitoria = competicao.ObterPontosVitoria() * peso;
            var pontosDerrota = competicao.ObterPontosDerrota() * peso;
            var empate = partida.TerminouEmpatada();
            var vencedoraId = partida.ObterDuplaVencedoraPorPlacar();
            var confronto = $"{partida.DuplaA.Nome} {partida.PlacarDuplaA} x {partida.PlacarDuplaB} {partida.DuplaB.Nome}";

            Acumular(
                categoriaAcumulada.Atletas,
                participacoesAplicadas,
                partida.DuplaA.Atleta1,
                categoria.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaAId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
            Acumular(
                categoriaAcumulada.Atletas,
                participacoesAplicadas,
                partida.DuplaA.Atleta2,
                categoria.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaAId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
            Acumular(
                categoriaAcumulada.Atletas,
                participacoesAplicadas,
                partida.DuplaB.Atleta1,
                categoria.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaBId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
            Acumular(
                categoriaAcumulada.Atletas,
                participacoesAplicadas,
                partida.DuplaB.Atleta2,
                categoria.Id,
                pontosParticipacao,
                empate,
                vencedoraId == partida.DuplaBId,
                pontosVitoria,
                pontosDerrota,
                partida.Id,
                confronto,
                dataPartida,
                competicao.Nome,
                categoria.Nome);
        }

        foreach (var partidasCategoria in partidas.GroupBy(x => x.CategoriaCompeticaoId))
        {
            if (acumuladoPorCategoria.TryGetValue(partidasCategoria.Key, out var categoriaAcumulada))
            {
                AplicarPontuacaoColocacao(partidasCategoria.ToList(), categoriaAcumulada.Atletas);
            }
        }

        return acumuladoPorCategoria.Values
            .OrderBy(x => x.NomeCompeticao)
            .ThenBy(x => x.Genero)
            .ThenBy(x => x.NomeCategoria)
            .Select(x => new RankingCategoriaDto(
                x.CategoriaId,
                x.CompeticaoId,
                x.NomeCompeticao,
                x.NomeCategoria,
                x.Genero,
                OrdenarAtletas(x.Atletas)))
            .ToList();
    }

    private static void AplicarPontuacaoColocacao(
        IReadOnlyList<Partida> partidasCategoria,
        IDictionary<Guid, RankingAtletaAcumulado> atletas)
    {
        if (partidasCategoria.Count == 0)
        {
            return;
        }

        var categoria = partidasCategoria[0].CategoriaCompeticao;
        var competicao = categoria.Competicao;
        if (competicao.Tipo != TipoCompeticao.Campeonato)
        {
            return;
        }

        var peso = categoria.PesoRanking;
        var final = partidasCategoria
            .Where(EhFaseFinal)
            .OrderByDescending(x => x.DataPartida ?? x.DataCriacao)
            .FirstOrDefault();

        if (final is not null)
        {
            AdicionarPontuacaoColocacao(
                atletas,
                ObterDuplaVencedora(final),
                competicao.ObterPontosPrimeiroLugar() * peso,
                final,
                competicao.Nome,
                categoria.Nome,
                "1º lugar");

            AdicionarPontuacaoColocacao(
                atletas,
                ObterDuplaPerdedora(final),
                competicao.ObterPontosSegundoLugar() * peso,
                final,
                competicao.Nome,
                categoria.Nome,
                "2º lugar");
        }

        var disputaTerceiro = partidasCategoria
            .Where(EhFaseTerceiroLugar)
            .OrderByDescending(x => x.DataPartida ?? x.DataCriacao)
            .FirstOrDefault();

        if (disputaTerceiro is null)
        {
            return;
        }

        AdicionarPontuacaoColocacao(
            atletas,
            ObterDuplaVencedora(disputaTerceiro),
            competicao.ObterPontosTerceiroLugar() * peso,
            disputaTerceiro,
            competicao.Nome,
            categoria.Nome,
            "3º lugar");
    }

    private static void AdicionarPontuacaoColocacao(
        IDictionary<Guid, RankingAtletaAcumulado> atletas,
        Dupla? dupla,
        decimal pontos,
        Partida partida,
        string nomeCompeticao,
        string nomeCategoria,
        string colocacao)
    {
        if (dupla is null || pontos <= 0)
        {
            return;
        }

        var confronto = $"Pontuação por colocação: {partida.DuplaA.Nome} {partida.PlacarDuplaA} x {partida.PlacarDuplaB} {partida.DuplaB.Nome}";
        var dataPartida = partida.DataPartida ?? partida.DataCriacao;
        AdicionarPontuacaoColocacaoAtleta(
            atletas,
            dupla.Atleta1,
            pontos,
            partida.Id,
            confronto,
            dataPartida,
            nomeCompeticao,
            nomeCategoria,
            colocacao);
        AdicionarPontuacaoColocacaoAtleta(
            atletas,
            dupla.Atleta2,
            pontos,
            partida.Id,
            confronto,
            dataPartida,
            nomeCompeticao,
            nomeCategoria,
            colocacao);
    }

    private static void AdicionarPontuacaoColocacaoAtleta(
        IDictionary<Guid, RankingAtletaAcumulado> atletas,
        Atleta atleta,
        decimal pontos,
        Guid partidaId,
        string confronto,
        DateTime dataPartida,
        string nomeCompeticao,
        string nomeCategoria,
        string colocacao)
    {
        if (!atletas.TryGetValue(atleta.Id, out var item))
        {
            item = CriarRankingAtletaAcumulado(atleta);
            atletas[atleta.Id] = item;
        }

        item.Pontos += pontos;
        item.Partidas.Add(new RankingPartidaDto(
            partidaId,
            confronto,
            dataPartida,
            nomeCompeticao,
            nomeCategoria,
            colocacao,
            pontos));
    }

    private static Dupla? ObterDuplaVencedora(Partida partida)
    {
        if (partida.DuplaVencedoraId == partida.DuplaAId)
        {
            return partida.DuplaA;
        }

        if (partida.DuplaVencedoraId == partida.DuplaBId)
        {
            return partida.DuplaB;
        }

        return null;
    }

    private static Dupla? ObterDuplaPerdedora(Partida partida)
    {
        if (partida.DuplaVencedoraId == partida.DuplaAId)
        {
            return partida.DuplaB;
        }

        if (partida.DuplaVencedoraId == partida.DuplaBId)
        {
            return partida.DuplaA;
        }

        return null;
    }

    private static bool EhFaseFinal(Partida partida)
    {
        var fase = NormalizarFaseRanking(partida.FaseCampeonato);
        return fase is "FINAL" or "FINAIS" or "GRANDEFINAL";
    }

    private static bool EhFaseTerceiroLugar(Partida partida)
    {
        var fase = NormalizarFaseRanking(partida.FaseCampeonato);
        return fase.Contains("3LUGAR", StringComparison.Ordinal) ||
            fase.Contains("TERCEIROLUGAR", StringComparison.Ordinal);
    }

    private static string NormalizarFaseRanking(string? faseCampeonato)
    {
        if (string.IsNullOrWhiteSpace(faseCampeonato))
        {
            return string.Empty;
        }

        var faseNormalizada = faseCampeonato.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(faseNormalizada.Length);

        foreach (var caractere in faseNormalizada)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caractere) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(caractere))
            {
                builder.Append(char.ToUpperInvariant(caractere));
            }
        }

        return builder.ToString();
    }

    private static IReadOnlyList<RankingAtletaDto> OrdenarAtletas(
        IDictionary<Guid, RankingAtletaAcumulado> atletas)
    {
        return atletas.Values
            .OrderByDescending(atleta => atleta.Pontos)
            .ThenByDescending(atleta => atleta.Vitorias)
            .ThenBy(atleta => atleta.NomeAtleta)
            .Select((atleta, indice) => new RankingAtletaDto(
                indice + 1,
                atleta.AtletaId,
                atleta.NomeAtleta,
                atleta.ApelidoAtleta,
                atleta.Lado,
                atleta.PossuiUsuarioVinculado,
                atleta.CadastroPendente,
                atleta.TemEmail,
                atleta.StatusPendencia,
                atleta.Jogos,
                atleta.Vitorias,
                atleta.Derrotas,
                atleta.Empates,
                atleta.Pontos,
                atleta.Partidas
                    .OrderByDescending(partida => partida.DataPartida)
                    .ToList()))
            .ToList();
    }

    private static void Acumular(
        IDictionary<Guid, RankingAtletaAcumulado> acumulado,
        ISet<(Guid AtletaId, Guid ReferenciaId)> participacoesAplicadas,
        Atleta atleta,
        Guid referenciaParticipacaoId,
        decimal pontosParticipacao,
        bool empate,
        bool venceu,
        decimal pontosVitoria,
        decimal pontosDerrota,
        Guid partidaId,
        string confronto,
        DateTime dataPartida,
        string nomeCompeticao,
        string nomeCategoria)
    {
        if (!acumulado.TryGetValue(atleta.Id, out var item))
        {
            item = CriarRankingAtletaAcumulado(atleta);
            acumulado[atleta.Id] = item;
        }

        var pontosPartida = ObterPontosParticipacaoUnica(
            participacoesAplicadas,
            atleta.Id,
            referenciaParticipacaoId,
            pontosParticipacao);
        item.Jogos++;

        if (empate)
        {
            item.Empates++;
            item.Pontos += pontosPartida;
            item.Partidas.Add(new RankingPartidaDto(
                partidaId,
                confronto,
                dataPartida,
                nomeCompeticao,
                nomeCategoria,
                "Empate",
                pontosPartida));
            return;
        }

        if (venceu)
        {
            item.Vitorias++;
            pontosPartida += pontosVitoria;
            item.Pontos += pontosPartida;
            item.Partidas.Add(new RankingPartidaDto(
                partidaId,
                confronto,
                dataPartida,
                nomeCompeticao,
                nomeCategoria,
                "Vitória",
                pontosPartida));
            return;
        }

        item.Derrotas++;
        pontosPartida += pontosDerrota;
        item.Pontos += pontosPartida;
        item.Partidas.Add(new RankingPartidaDto(
            partidaId,
            confronto,
            dataPartida,
            nomeCompeticao,
            nomeCategoria,
            "Derrota",
            pontosPartida));
    }

    private static decimal ObterPontosParticipacaoUnica(
        ISet<(Guid AtletaId, Guid ReferenciaId)> participacoesAplicadas,
        Guid atletaId,
        Guid referenciaParticipacaoId,
        decimal pontosParticipacao)
    {
        return participacoesAplicadas.Add((atletaId, referenciaParticipacaoId))
            ? pontosParticipacao
            : 0m;
    }

    private sealed class RankingAtletaAcumulado(
        Guid atletaId,
        string nomeAtleta,
        string? apelidoAtleta,
        LadoAtleta lado,
        bool possuiUsuarioVinculado,
        bool cadastroPendente,
        bool temEmail,
        string statusPendencia)
    {
        public Guid AtletaId { get; } = atletaId;
        public string NomeAtleta { get; } = nomeAtleta;
        public string? ApelidoAtleta { get; } = apelidoAtleta;
        public LadoAtleta Lado { get; } = lado;
        public bool PossuiUsuarioVinculado { get; } = possuiUsuarioVinculado;
        public bool CadastroPendente { get; } = cadastroPendente;
        public bool TemEmail { get; } = temEmail;
        public string StatusPendencia { get; } = statusPendencia;
        public int Jogos { get; set; }
        public int Vitorias { get; set; }
        public int Derrotas { get; set; }
        public int Empates { get; set; }
        public decimal Pontos { get; set; }
        public List<RankingPartidaDto> Partidas { get; } = [];
    }

    private static RankingAtletaAcumulado CriarRankingAtletaAcumulado(Atleta atleta)
    {
        return new RankingAtletaAcumulado(
            atleta.Id,
            atleta.Nome,
            atleta.Apelido,
            atleta.Lado,
            StatusCadastroAtletaUtil.PossuiUsuarioVinculado(atleta),
            atleta.CadastroPendente,
            StatusCadastroAtletaUtil.TemEmail(atleta),
            StatusCadastroAtletaUtil.ObterStatusPendencia(atleta));
    }

    private sealed class RankingCategoriaAcumulado(
        Guid categoriaId,
        Guid competicaoId,
        string nomeCompeticao,
        string nomeCategoria,
        GeneroCategoria genero)
    {
        public Guid CategoriaId { get; } = categoriaId;
        public Guid CompeticaoId { get; } = competicaoId;
        public string NomeCompeticao { get; } = nomeCompeticao;
        public string NomeCategoria { get; } = nomeCategoria;
        public GeneroCategoria Genero { get; } = genero;
        public Dictionary<Guid, RankingAtletaAcumulado> Atletas { get; } = new();
    }
}
