namespace PlataformaFutevolei.Dominio.Entidades;

public class Partida : EntidadeBase
{
    public Guid CategoriaCompeticaoId { get; set; }
    public Guid DuplaAId { get; set; }
    public Guid DuplaBId { get; set; }
    public int PlacarDuplaA { get; set; }
    public int PlacarDuplaB { get; set; }
    public Guid DuplaVencedoraId { get; set; }
    public DateTime DataPartida { get; set; }
    public string? Observacoes { get; set; }

    public CategoriaCompeticao CategoriaCompeticao { get; set; } = default!;
    public Dupla DuplaA { get; set; } = default!;
    public Dupla DuplaB { get; set; } = default!;
    public Dupla DuplaVencedora { get; set; } = default!;

    public int ObterMaiorPlacar() => Math.Max(PlacarDuplaA, PlacarDuplaB);

    public int ObterDiferencaPlacar() => Math.Abs(PlacarDuplaA - PlacarDuplaB);

    public Guid ObterDuplaVencedoraPorPlacar()
    {
        if (PlacarDuplaA == PlacarDuplaB)
        {
            throw new InvalidOperationException("Partidas empatadas não possuem dupla vencedora.");
        }

        return PlacarDuplaA > PlacarDuplaB ? DuplaAId : DuplaBId;
    }

    public decimal CalcularPontosRankingVitoria(decimal? pesoRanking = null)
    {
        var peso = pesoRanking ?? CategoriaCompeticao?.PesoRanking ?? 1m;
        return 3m * peso;
    }
}
