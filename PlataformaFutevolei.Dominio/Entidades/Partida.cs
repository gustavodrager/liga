using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Dominio.Entidades;

public class Partida : EntidadeBase
{
    public Guid CategoriaCompeticaoId { get; set; }
    public Guid? CriadoPorUsuarioId { get; set; }
    public Guid DuplaAId { get; set; }
    public Guid DuplaBId { get; set; }
    public string? FaseCampeonato { get; set; }
    public StatusPartida Status { get; set; } = StatusPartida.Agendada;
    public StatusAprovacaoPartida StatusAprovacao { get; set; } = StatusAprovacaoPartida.Aprovada;
    public int PlacarDuplaA { get; set; }
    public int PlacarDuplaB { get; set; }
    public Guid? DuplaVencedoraId { get; set; }
    public DateTime? DataPartida { get; set; }
    public string? Observacoes { get; set; }

    public CategoriaCompeticao CategoriaCompeticao { get; set; } = default!;
    public Usuario? CriadoPorUsuario { get; set; }
    public Dupla DuplaA { get; set; } = default!;
    public Dupla DuplaB { get; set; } = default!;
    public Dupla? DuplaVencedora { get; set; }
    public ICollection<PartidaAprovacao> Aprovacoes { get; set; } = new List<PartidaAprovacao>();
    public ICollection<PendenciaUsuario> Pendencias { get; set; } = new List<PendenciaUsuario>();

    public int ObterMaiorPlacar() => Math.Max(PlacarDuplaA, PlacarDuplaB);

    public int ObterDiferencaPlacar() => Math.Abs(PlacarDuplaA - PlacarDuplaB);

    public bool TerminouEmpatada() => PlacarDuplaA == PlacarDuplaB;

    public Guid? ObterDuplaVencedoraPorPlacar()
    {
        if (TerminouEmpatada())
        {
            return null;
        }

        return PlacarDuplaA > PlacarDuplaB ? DuplaAId : DuplaBId;
    }

    public decimal CalcularPontosRankingVitoria(decimal? pesoRanking = null)
    {
        if (DuplaVencedoraId is null)
        {
            return 0m;
        }

        var peso = pesoRanking ?? CategoriaCompeticao?.PesoRanking ?? 1m;
        var pontosVitoria = CategoriaCompeticao?.Competicao?.ObterPontosVitoria() ?? Competicao.PontosVitoriaPadrao;
        return pontosVitoria * peso;
    }
}
