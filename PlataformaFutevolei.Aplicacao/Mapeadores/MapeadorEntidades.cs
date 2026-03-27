using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Mapeadores;

internal static class MapeadorEntidades
{
    private const string MarcadorMetadadosChave = "[[chave:";
    private const string MarcadorMetadadosRodada = "[[rodada:";

    public static UsuarioLogadoDto ParaDto(this Usuario usuario)
        => new(
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.Perfil,
            usuario.Ativo,
            usuario.AtletaId,
            usuario.Atleta?.ParaResumoDto()
        );

    public static UsuarioDto ParaAdminDto(this Usuario usuario)
        => new(
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.Perfil,
            usuario.Ativo,
            usuario.AtletaId,
            usuario.Atleta?.ParaResumoDto(),
            usuario.DataCriacao,
            usuario.DataAtualizacao
        );

    public static AtletaResumoDto ParaResumoDto(this Atleta atleta)
        => new(
            atleta.Id,
            atleta.Nome,
            atleta.Apelido,
            atleta.Telefone,
            atleta.Email,
            atleta.Instagram,
            atleta.Cpf,
            atleta.CadastroPendente
        );

    public static AtletaDto ParaDto(this Atleta atleta)
        => new(
            atleta.Id,
            atleta.Nome,
            atleta.Apelido,
            atleta.Telefone,
            atleta.Email,
            atleta.Instagram,
            atleta.Cpf,
            atleta.CadastroPendente,
            atleta.Lado,
            atleta.DataNascimento,
            atleta.DataCriacao,
            atleta.DataAtualizacao
        );

    public static DuplaDto ParaDto(this Dupla dupla)
        => new(
            dupla.Id,
            dupla.Nome,
            dupla.Atleta1Id,
            dupla.Atleta1?.Nome ?? string.Empty,
            dupla.Atleta2Id,
            dupla.Atleta2?.Nome ?? string.Empty,
            dupla.DataCriacao,
            dupla.DataAtualizacao
        );

    public static LigaDto ParaDto(this Liga liga)
        => new(
            liga.Id,
            liga.Nome,
            liga.Descricao,
            liga.DataCriacao,
            liga.DataAtualizacao
        );

    public static LocalDto ParaDto(this Local local)
        => new(
            local.Id,
            local.Nome,
            local.Tipo,
            local.QuantidadeQuadras,
            local.UsuarioCriadorId,
            local.UsuarioCriador?.Nome,
            local.DataCriacao,
            local.DataAtualizacao
        );

    public static FormatoCampeonatoDto ParaDto(this FormatoCampeonato formato)
        => new(
            formato.Id,
            formato.Nome,
            formato.Descricao,
            formato.TipoFormato,
            formato.Ativo,
            formato.QuantidadeGrupos,
            formato.ClassificadosPorGrupo,
            formato.GeraMataMataAposGrupos,
            formato.TurnoEVolta,
            formato.TipoChave,
            formato.QuantidadeDerrotasParaEliminacao,
            formato.PermiteCabecaDeChave,
            formato.DisputaTerceiroLugar,
            formato.DataCriacao,
            formato.DataAtualizacao
        );

    public static CompeticaoDto ParaDto(this Competicao competicao)
        => new(
            competicao.Id,
            competicao.Nome,
            competicao.Tipo,
            competicao.Descricao,
            competicao.DataInicio,
            competicao.DataFim,
            competicao.LigaId,
            competicao.LocalId,
            competicao.FormatoCampeonatoId,
            competicao.RegraCompeticaoId,
            competicao.UsuarioOrganizadorId,
            competicao.Liga?.Nome,
            competicao.Local?.Nome,
            competicao.FormatoCampeonato?.Nome,
            competicao.RegraCompeticao?.Nome,
            competicao.UsuarioOrganizador?.Nome,
            competicao.LigaId.HasValue,
            competicao.InscricoesAbertas,
            competicao.PossuiFinalReset,
            competicao.ObterPontosMinimosPartida(),
            competicao.ObterDiferencaMinimaPartida(),
            competicao.ObterPermiteEmpate(),
            competicao.ObterPontosVitoria(),
            competicao.ObterPontosDerrota(),
            competicao.ObterPontosParticipacao(),
            competicao.DataCriacao,
            competicao.DataAtualizacao
        );

    public static GrupoAtletaDto ParaDto(this GrupoAtleta grupoAtleta)
        => new(
            grupoAtleta.Id,
            grupoAtleta.CompeticaoId,
            grupoAtleta.AtletaId,
            grupoAtleta.Atleta?.Nome ?? string.Empty,
            grupoAtleta.Atleta?.Apelido,
            grupoAtleta.Atleta?.CadastroPendente ?? false,
            grupoAtleta.Atleta?.Usuario is not null,
            grupoAtleta.DataCriacao,
            grupoAtleta.DataAtualizacao
        );

    public static RegraCompeticaoDto ParaDto(this RegraCompeticao regra)
        => new(
            regra.Id,
            regra.Nome,
            regra.Descricao,
            regra.PontosMinimosPartida,
            regra.DiferencaMinimaPartida,
            regra.PermiteEmpate,
            regra.PontosVitoria,
            regra.PontosDerrota,
            regra.PontosParticipacao,
            regra.PontosPrimeiroLugar,
            regra.PontosSegundoLugar,
            regra.PontosTerceiroLugar,
            regra.UsuarioCriadorId,
            regra.UsuarioCriador?.Nome,
            regra.DataCriacao,
            regra.DataAtualizacao
        );

    public static CategoriaCompeticaoDto ParaDto(this CategoriaCompeticao categoria)
    {
        var formatoEfetivo = categoria.ObterFormatoCampeonatoEfetivo();
        var usaFormatoCampeonatoDaCompeticao = categoria.FormatoCampeonatoId is null &&
            categoria.Competicao?.FormatoCampeonatoId is not null;

        return new CategoriaCompeticaoDto(
            categoria.Id,
            categoria.CompeticaoId,
            categoria.FormatoCampeonatoId,
            formatoEfetivo?.Id,
            categoria.TabelaJogosAprovada,
            categoria.TabelaJogosAprovadaPorUsuarioId,
            categoria.TabelaJogosAprovadaEmUtc,
            categoria.Competicao?.Nome ?? string.Empty,
            categoria.FormatoCampeonato?.Nome,
            formatoEfetivo?.Nome,
            usaFormatoCampeonatoDaCompeticao,
            categoria.Nome,
            categoria.Genero,
            categoria.Nivel,
            categoria.PesoRanking,
            categoria.QuantidadeMaximaDuplas,
            categoria.InscricoesEncerradas,
            categoria.Inscricoes?.Count ?? 0,
            categoria.DataCriacao,
            categoria.DataAtualizacao
        );
    }

    public static PartidaDto ParaDto(this Partida partida)
        => new(
            partida.Id,
            partida.CategoriaCompeticaoId,
            partida.CategoriaCompeticao?.Nome ?? string.Empty,
            partida.DuplaAId,
            partida.DuplaA?.Nome ?? string.Empty,
            partida.DuplaA?.Atleta1Id ?? Guid.Empty,
            partida.DuplaA?.Atleta1?.Nome ?? string.Empty,
            partida.DuplaA?.Atleta2Id ?? Guid.Empty,
            partida.DuplaA?.Atleta2?.Nome ?? string.Empty,
            partida.DuplaBId,
            partida.DuplaB?.Nome ?? string.Empty,
            partida.DuplaB?.Atleta1Id ?? Guid.Empty,
            partida.DuplaB?.Atleta1?.Nome ?? string.Empty,
            partida.DuplaB?.Atleta2Id ?? Guid.Empty,
            partida.DuplaB?.Atleta2?.Nome ?? string.Empty,
            partida.FaseCampeonato,
            partida.Status,
            partida.PlacarDuplaA,
            partida.PlacarDuplaB,
            partida.DuplaVencedoraId,
            partida.DuplaVencedora?.Nome,
            partida.CategoriaCompeticao?.PesoRanking ?? 1m,
            partida.CalcularPontosRankingVitoria(),
            partida.DataPartida,
            LimparObservacoesSistema(partida.Observacoes),
            partida.DataCriacao,
            partida.DataAtualizacao
        );

    public static InscricaoCampeonatoDto ParaDto(this InscricaoCampeonato inscricao)
        => new(
            inscricao.Id,
            inscricao.CompeticaoId,
            inscricao.Competicao?.Nome ?? string.Empty,
            inscricao.CategoriaCompeticaoId,
            inscricao.CategoriaCompeticao?.Nome ?? string.Empty,
            inscricao.DuplaId,
            inscricao.Dupla?.Nome ?? string.Empty,
            inscricao.Dupla?.Atleta1Id ?? Guid.Empty,
            inscricao.Dupla?.Atleta1?.Nome ?? string.Empty,
            inscricao.Dupla?.Atleta2Id ?? Guid.Empty,
            inscricao.Dupla?.Atleta2?.Nome ?? string.Empty,
            inscricao.Status,
            inscricao.Pago,
            inscricao.Observacao,
            inscricao.DataInscricaoUtc,
            inscricao.DataCriacao,
            inscricao.DataAtualizacao
        );

    private static string? LimparObservacoesSistema(string? observacoes)
    {
        if (string.IsNullOrWhiteSpace(observacoes))
        {
            return null;
        }

        var linhas = observacoes
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x =>
                !x.StartsWith(MarcadorMetadadosChave, StringComparison.Ordinal) &&
                !x.StartsWith(MarcadorMetadadosRodada, StringComparison.Ordinal))
            .ToList();

        return linhas.Count == 0 ? null : string.Join(Environment.NewLine, linhas);
    }
}
