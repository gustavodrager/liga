using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Mapeadores;

internal static class MapeadorEntidades
{
    public static UsuarioLogadoDto ParaDto(this Usuario usuario)
        => new(
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.Perfil
        );

    public static AtletaDto ParaDto(this Atleta atleta)
        => new(
            atleta.Id,
            atleta.Nome,
            atleta.Apelido,
            atleta.Cidade,
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

    public static CompeticaoDto ParaDto(this Competicao competicao)
        => new(
            competicao.Id,
            competicao.Nome,
            competicao.Tipo,
            competicao.Descricao,
            competicao.DataInicio,
            competicao.DataFim,
            competicao.LigaId,
            competicao.Liga?.Nome,
            competicao.ContaRankingLiga,
            competicao.InscricoesAbertas,
            competicao.DataCriacao,
            competicao.DataAtualizacao
        );

    public static CategoriaCompeticaoDto ParaDto(this CategoriaCompeticao categoria)
        => new(
            categoria.Id,
            categoria.CompeticaoId,
            categoria.Competicao?.Nome ?? string.Empty,
            categoria.Nome,
            categoria.Genero,
            categoria.Nivel,
            categoria.PesoRanking,
            categoria.DataCriacao,
            categoria.DataAtualizacao
        );

    public static PartidaDto ParaDto(this Partida partida)
        => new(
            partida.Id,
            partida.CategoriaCompeticaoId,
            partida.CategoriaCompeticao?.Nome ?? string.Empty,
            partida.DuplaAId,
            partida.DuplaA?.Nome ?? string.Empty,
            partida.DuplaBId,
            partida.DuplaB?.Nome ?? string.Empty,
            partida.PlacarDuplaA,
            partida.PlacarDuplaB,
            partida.DuplaVencedoraId,
            partida.DuplaVencedora?.Nome ?? string.Empty,
            partida.CategoriaCompeticao?.PesoRanking ?? 1m,
            partida.CalcularPontosRankingVitoria(),
            partida.DataPartida,
            partida.Observacoes,
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
            inscricao.Atleta1Id,
            inscricao.Atleta1?.Nome ?? string.Empty,
            inscricao.Atleta2Id,
            inscricao.Atleta2?.Nome ?? string.Empty,
            inscricao.Status,
            inscricao.Observacao,
            inscricao.DataInscricaoUtc,
            inscricao.DataCriacao,
            inscricao.DataAtualizacao
        );
}
